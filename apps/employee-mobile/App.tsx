import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  AppState,
} from 'react-native';
// React Native's own SafeAreaView is iOS-only; with targetSdk 35 Android draws edge-to-edge, so the
// status bar and gesture bar overlap content unless we apply real insets.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import LoginScreen from './src/screens/LoginScreen';
import DutyDashboardScreen from './src/screens/DutyDashboardScreen';
import { AnnouncementBanner, CrashScreen, MaintenanceScreen, OfflineScreen, ServerUnreachableScreen } from './src/screens/StatusScreens';
import { DeviceBindingService } from './src/services/DeviceBindingService';
import { EmployeeApi } from './src/services/EmployeeApi';
import { AutoUpdateService, UpdateDecision } from './src/services/AutoUpdateService';
import { BackgroundTrackingService } from './src/services/BackgroundTrackingService';
import { SessionEvents } from './src/services/SessionEvents';
import { RemoteConfigService, REMOTE_STATUS_POLL_MS, type RemoteStatus } from './src/services/RemoteConfigService';
import { ReminderService } from './src/services/ReminderService';

/** Catches render-time crashes so the employee sees a branded recovery screen instead of a blank app. */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.warn('[ErrorBoundary]', error?.message);
  }
  render() {
    if (this.state.error) {
      return <CrashScreen errorText={this.state.error.message} onRestart={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

type Connectivity = 'online' | 'offline';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [updateDecision, setUpdateDecision] = useState<UpdateDecision | null>(null);
  const [connectivity, setConnectivity] = useState<Connectivity>('online');
  const [remote, setRemote] = useState<RemoteStatus>(RemoteConfigService.last);
  const [serverProblem, setServerProblem] = useState<{ httpStatus?: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const onDutyRef = useRef(false);

  // Any 401 from the API layers (attendance, waypoint queue, native service flags) ends the session.
  useEffect(() => {
    SessionEvents.setUnauthorizedHandler(() => {
      BackgroundTrackingService.stop().catch(() => undefined);
      DeviceBindingService.clearSession().catch(() => undefined);
      setSession(null);
      Alert.alert('Signed out', 'Your session has expired or was reset by your manager. Please sign in again.');
    });
    // A 503 MAINTENANCE from any action flips the app into maintenance mode immediately.
    SessionEvents.setMaintenanceHandler((payload) => setRemote(RemoteConfigService.fromMaintenanceError(payload)));
    return () => {
      SessionEvents.setUnauthorizedHandler(null);
      SessionEvents.setMaintenanceHandler(null);
    };
  }, []);

  /** Remote status: maintenance / announcements / support. Distinguishes "no internet" from "server down". */
  const refreshRemote = useCallback(async () => {
    setChecking(true);
    try {
      const result = await RemoteConfigService.fetch();
      if (result.ok) {
        setRemote(result.status);
        setServerProblem(null);
      } else if (result.reason === 'SERVER') {
        setServerProblem({ httpStatus: result.httpStatus });
      }
      // NETWORK failures are represented by the NetInfo-driven offline state.
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await RemoteConfigService.hydrate();
      const info = await DeviceBindingService.getDeviceFingerprint();
      setDeviceInfo(info);
      const saved = await DeviceBindingService.getSavedSession();
      if (saved) setSession(saved);
      setLoading(false);

      refreshRemote();
      const decision = await AutoUpdateService.checkForUpdates();
      if (decision) setUpdateDecision(decision);
    })();

    const checkUpdate = async () => {
      const decision = await AutoUpdateService.checkForUpdates();
      if (decision) setUpdateDecision(decision);
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshRemote();
        checkUpdate();
      }
    });
    const updateInterval = setInterval(checkUpdate, RemoteConfigService.config.intervals.update_check_ms);
    const statusInterval = setInterval(refreshRemote, RemoteConfigService.config.intervals.status_poll_ms || REMOTE_STATUS_POLL_MS);

    // Connectivity: offline = no network or internet confirmed unreachable.
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setConnectivity((prev) => {
        const next: Connectivity = offline ? 'offline' : 'online';
        if (prev === 'offline' && next === 'online') refreshRemote();
        return next;
      });
    });

    return () => {
      sub.remove();
      clearInterval(updateInterval);
      clearInterval(statusInterval);
      unsubscribeNet();
    };
  }, [refreshRemote]);

  const retryConnectivity = useCallback(async () => {
    setChecking(true);
    try {
      const state = await NetInfo.fetch();
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setConnectivity(offline ? 'offline' : 'online');
      if (!offline) await refreshRemote();
    } finally {
      setChecking(false);
    }
  }, [refreshRemote]);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Image source={require('./assets/logo-mark.png')} style={styles.loadingLogo} resizeMode="contain" />
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Preparing your workspace…</Text>
          <Image source={require('./assets/developed-by-jsp-coders.png')} style={styles.loadingBranding} resizeMode="contain" />
        </View>
      </SafeAreaProvider>
    );
  }

  let statusScreen: React.ReactNode = null;
  if (connectivity === 'offline') {
    statusScreen = <OfflineScreen onRetry={retryConnectivity} retrying={checking} onDuty={onDutyRef.current} />;
  } else if (remote.maintenance.mobile) {
    statusScreen = <MaintenanceScreen maintenance={remote.maintenance} support={remote.support} onRetry={refreshRemote} retrying={checking} onDuty={onDutyRef.current} />;
  } else if (serverProblem) {
    statusScreen = <ServerUnreachableScreen onRetry={refreshRemote} retrying={checking} support={remote.support} httpStatus={serverProblem.httpStatus} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent />
          {statusScreen ?? (
            <>
              {remote.announcement && <AnnouncementBanner text={remote.announcement.text} level={remote.announcement.level} />}
              {session ? (
                <DutyDashboardScreen
                  session={session}
                  deviceInfo={deviceInfo}
                  onShiftStatus={(onDuty) => {
                    onDutyRef.current = onDuty;
                  }}
                  onLogout={async () => {
                    await ReminderService.cancelAll().catch(() => undefined);
                    await BackgroundTrackingService.stop().catch(() => undefined);
                    await EmployeeApi.logout(session).catch(() => undefined);
                    await DeviceBindingService.clearSession();
                    setSession(null);
                  }}
                />
              ) : (
                <LoginScreen onLoginSuccess={(user) => setSession(user)} deviceInfo={deviceInfo} />
              )}
            </>
          )}

          {/* Auto-Sensed Update Modal */}
          {updateDecision && !statusScreen && (
            <Modal transparent animationType="fade" visible={true}>
              <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {updateDecision.forced ? 'Required Update' : 'Auto Update Available'}
                    </Text>
                  </View>
                  <Text style={styles.modalTitle}>Update to v{updateDecision.info.latest_version}</Text>
                  <Text style={styles.modalBody}>{AutoUpdateService.describe(updateDecision)}</Text>
                  <TouchableOpacity style={styles.updateButton} onPress={() => AutoUpdateService.openUpdate(updateDecision.info)}>
                    <Text style={styles.updateButtonText}>Install Update Now</Text>
                  </TouchableOpacity>
                  {!updateDecision.forced && (
                    <TouchableOpacity
                      style={{ marginTop: 12 }}
                      onPress={async () => {
                        await AutoUpdateService.dismiss(updateDecision.info);
                        setUpdateDecision(null);
                      }}
                    >
                      <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>Remind Me Later</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Modal>
          )}
        </SafeAreaView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 12,
  },
  loadingLogo: { width: 96, height: 96, marginBottom: 24 },
  loadingBranding: { position: 'absolute', bottom: 40, width: 200, height: 80 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  badge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 12,
  },
  badgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  updateButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
