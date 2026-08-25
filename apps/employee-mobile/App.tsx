import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  AppState,
} from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import DutyDashboardScreen from './src/screens/DutyDashboardScreen';
import { DeviceBindingService } from './src/services/DeviceBindingService';
import { EmployeeApi } from './src/services/EmployeeApi';
import { AutoUpdateService, AppVersionInfo } from './src/services/AutoUpdateService';
import { BackgroundTrackingService } from './src/services/BackgroundTrackingService';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);

  useEffect(() => {
    (async () => {
      const info = await DeviceBindingService.getDeviceFingerprint();
      setDeviceInfo(info);
      const saved = await DeviceBindingService.getSavedSession();
      if (saved) setSession(saved);
      setLoading(false);

      // Automatically sense and check for updates
      AutoUpdateService.checkForUpdates((detected) => {
        setUpdateInfo(detected);
      });
    })();

    // Auto-check on app resume and every 15 minutes
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        AutoUpdateService.checkForUpdates((detected) => setUpdateInfo(detected));
      }
    });

    const updateInterval = setInterval(() => {
      AutoUpdateService.checkForUpdates((detected) => setUpdateInfo(detected));
    }, 15 * 60 * 1000);

    return () => {
      sub.remove();
      clearInterval(updateInterval);
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Preparing your workspace…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      {session ? (
        <DutyDashboardScreen
          session={session}
          deviceInfo={deviceInfo}
          onLogout={async () => {
            await BackgroundTrackingService.stop().catch(() => undefined);
            await EmployeeApi.logout(session).catch(() => undefined);
            await DeviceBindingService.clearSession();
            setSession(null);
          }}
        />
      ) : (
        <LoginScreen onLoginSuccess={(user) => setSession(user)} deviceInfo={deviceInfo} />
      )}

      {/* Auto-Sensed Update Modal */}
      {updateInfo && (
        <Modal transparent animationType="fade" visible={true}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Auto Update Available</Text>
              </View>
              <Text style={styles.modalTitle}>Update to v{updateInfo.latest_version}</Text>
              <Text style={styles.modalBody}>
                {updateInfo.release_notes || 'A new required version of Perzent Workforce is available with critical location and security upgrades.'}
              </Text>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={() => AutoUpdateService.triggerInstall(updateInfo.download_url)}
              >
                <Text style={styles.updateButtonText}>Install Update Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
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
