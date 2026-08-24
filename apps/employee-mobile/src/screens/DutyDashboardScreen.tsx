import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DeviceIntegrityService, WorkReadiness } from '../services/DeviceIntegrityService';
import { EmployeeApi } from '../services/EmployeeApi';

type ShiftStatus = 'CHECKED_OUT' | 'CHECKED_IN' | 'ON_BREAK';

export default function DutyDashboardScreen({
  session,
  deviceInfo,
  onLogout,
}: {
  session: any;
  deviceInfo?: any;
  onLogout: () => void;
}) {
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>('CHECKED_OUT');
  const [punchInTimestamp, setPunchInTimestamp] = useState<number | null>(null);
  const [breakStartTimestamp, setBreakStartTimestamp] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [breakTimerSec, setBreakTimerSec] = useState(1800);
  const [readiness, setReadiness] = useState<WorkReadiness | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const refreshReadiness = useCallback(async (sendToOwner = false) => {
    try {
      const next = await DeviceIntegrityService.inspect();
      setReadiness(next);
      if (sendToOwner) {
        await EmployeeApi.attendance(session, 'PATCH', {
          telemetry: next.telemetry,
          device: deviceInfo,
        }).catch(() => undefined);
      }
      return next;
    } catch {
      return null;
    }
  }, [deviceInfo, session]);

  const updateClocks = useCallback(() => {
    if (punchInTimestamp && shiftStatus === 'CHECKED_IN') {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - punchInTimestamp) / 1000)));
    }
    if (breakStartTimestamp && shiftStatus === 'ON_BREAK') {
      const used = Math.floor((Date.now() - breakStartTimestamp) / 1000);
      setBreakTimerSec(Math.max(0, 1800 - used));
    }
  }, [punchInTimestamp, breakStartTimestamp, shiftStatus]);

  useEffect(() => {
    EmployeeApi.attendance(session)
      .then((data) => {
        const status = data.status === 'AUTO_CHECKED_OUT' ? 'CHECKED_OUT' : data.status;
        setShiftStatus(status);
        if (data.punch_in_time) {
          const t = new Date(data.punch_in_time).getTime();
          setPunchInTimestamp(t);
          setElapsedSec(Math.max(0, Math.floor((Date.now() - t) / 1000)));
        }
        if (data.active_break_started_at) {
          const bt = new Date(data.active_break_started_at).getTime();
          setBreakStartTimestamp(bt);
          const used = Math.floor((Date.now() - bt) / 1000);
          setBreakTimerSec(Math.max(0, 1800 - used));
        }
      })
      .catch((error) => Alert.alert('Sync failed', error.message));

    refreshReadiness(true);
    const complianceTimer = setInterval(() => refreshReadiness(true), 60_000);
    return () => clearInterval(complianceTimer);
  }, [refreshReadiness, session]);

  // AppState listener: immediately re-compute clocks when app moves from background to active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateClocks();
        refreshReadiness(true);
      }
    });
    return () => subscription.remove();
  }, [updateClocks, refreshReadiness]);

  // Real-time ticking clock based on absolute time differences
  useEffect(() => {
    if (shiftStatus !== 'CHECKED_IN' && shiftStatus !== 'ON_BREAK') return;
    updateClocks();
    const timer = setInterval(updateClocks, 1000);
    return () => clearInterval(timer);
  }, [shiftStatus, updateClocks]);

  // Background waypoint ping while checked in
  useEffect(() => {
    if (shiftStatus !== 'CHECKED_IN') return;
    const pingLocation = async () => {
      try {
        const pos = await EmployeeApi.currentPosition();
        await EmployeeApi.sendWaypoint(session, pos);
      } catch {
        // Silent failure for background blips
      }
    };
    pingLocation();
    const locInterval = setInterval(pingLocation, 60_000);

    return () => clearInterval(locInterval);
  }, [shiftStatus, session]);

  const verifiedReadiness = async () => {
    const next = await DeviceIntegrityService.inspect({ requestPermission: true, acquirePosition: true });
    setReadiness(next);
    await EmployeeApi.attendance(session, 'PATCH', {
      telemetry: next.telemetry,
      device: deviceInfo,
    }).catch(() => undefined);
    if (!next.ready || !next.position) {
      const message = next.blockers.map((item) => `• ${item.message}`).join('\n');
      Alert.alert('Check-in blocked', message || 'A verified GPS position is required.');
      return null;
    }
    return next;
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const verified = await verifiedReadiness();
      if (!verified?.position) return;
      const result = await EmployeeApi.attendance(session, 'POST', {
        action: 'check_in',
        ...verified.position,
        integrity: verified.telemetry,
      });
      setElapsedSec(0);
      setShiftStatus(result.status);
      Alert.alert('Shift started', 'Your location and attendance were verified.');
    } catch (error: any) {
      Alert.alert('Check-in failed', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = () => {
    Alert.alert('End shift?', 'Your checkout location will be verified before the shift ends.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check out',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            const position = await EmployeeApi.currentPosition();
            await EmployeeApi.attendance(session, 'POST', { action: 'check_out', ...position });
            setShiftStatus('CHECKED_OUT');
          } catch (error: any) {
            Alert.alert('Check-out failed', error.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleStartBreak = () => {
    Alert.alert('Start break?', 'Work location tracking pauses during your break.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start break',
        onPress: async () => {
          setActionLoading(true);
          try {
            await EmployeeApi.attendance(session, 'POST', { action: 'start_break' });
            setShiftStatus('ON_BREAK');
            setBreakTimerSec(1800);
          } catch (error: any) {
            Alert.alert('Break failed', error.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      const verified = await verifiedReadiness();
      if (!verified) return;
      await EmployeeApi.attendance(session, 'POST', { action: 'resume', integrity: verified.telemetry });
      setShiftStatus('CHECKED_IN');
    } catch (error: any) {
      Alert.alert('Resume failed', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const statusLabel = shiftStatus === 'CHECKED_IN'
    ? 'On duty'
    : shiftStatus === 'ON_BREAK'
      ? 'On break'
      : 'Not checked in';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.brandMark}><Text style={styles.brandLetter}>P</Text></View>
        <View style={styles.identity}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{session.full_name}</Text>
          <Text style={styles.role}>{session.designation || 'Employee'}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, shiftStatus === 'CHECKED_IN' && styles.statusDotActive]} />
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        </View>
        <Text style={styles.timer}>
          {shiftStatus === 'ON_BREAK' ? formatDuration(breakTimerSec) : formatDuration(elapsedSec)}
        </Text>
        <Text style={styles.timerCaption}>
          {shiftStatus === 'ON_BREAK' ? 'Break time remaining' : 'Shift duration'}
        </Text>
      </View>

      <View style={[styles.readinessCard, readiness?.ready ? styles.readyCard : styles.blockedCard]}>
        <View style={styles.readinessHeading}>
          <Text style={styles.readinessIcon}>{readiness?.ready ? '✓' : '!'}</Text>
          <View style={styles.readinessCopy}>
            <Text style={styles.readinessTitle}>
              {readiness?.ready ? 'Ready for work' : readiness ? 'Action required' : 'Checking requirements…'}
            </Text>
            <Text style={styles.readinessSubtitle}>
              {readiness?.ready
                ? 'Location and device requirements are active.'
                : 'Complete these items before checking in or resuming.'}
            </Text>
          </View>
        </View>
        {readiness?.blockers.map((blocker) => (
          <Text key={blocker.code} style={styles.blockerText}>• {blocker.message}</Text>
        ))}
        {readiness?.blockers.some((item) => item.code === 'LOCATION_PERMISSION') && (
          <TouchableOpacity style={styles.settingsButton} onPress={() => DeviceIntegrityService.openAppSettings()}>
            <Text style={styles.settingsButtonText}>Open app settings</Text>
          </TouchableOpacity>
        )}
      </View>

      {shiftStatus === 'CHECKED_OUT' && (
        <TouchableOpacity
          style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
          onPress={handleCheckIn}
          disabled={actionLoading}
        >
          <Text style={styles.primaryButtonText}>{actionLoading ? 'Checking…' : 'Check in'}</Text>
        </TouchableOpacity>
      )}

      {shiftStatus === 'CHECKED_IN' && (
        <View style={styles.actionStack}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleStartBreak} disabled={actionLoading}>
            <Text style={styles.secondaryButtonText}>Start break</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckOut} disabled={actionLoading}>
            <Text style={styles.checkoutButtonText}>Check out</Text>
          </TouchableOpacity>
        </View>
      )}

      {shiftStatus === 'ON_BREAK' && (
        <TouchableOpacity
          style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
          onPress={handleResume}
          disabled={actionLoading}
        >
          <Text style={styles.primaryButtonText}>{actionLoading ? 'Checking…' : 'Resume shift'}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.privacyNote}>
        <Text style={styles.privacyTitle}>Privacy during work</Text>
        <Text style={styles.privacyText}>
          Location is used for attendance and active-shift tracking. Device compliance details are shared only with authorized management.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#F8FAFC', padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLetter: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  identity: { flex: 1, marginLeft: 12 },
  greeting: { color: '#64748B', fontSize: 12 },
  name: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  role: { color: '#64748B', fontSize: 12, marginTop: 1 },
  logoutButton: { paddingVertical: 9, paddingHorizontal: 12 },
  logoutText: { color: '#475569', fontWeight: '700' },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    alignItems: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#94A3B8', marginRight: 8 },
  statusDotActive: { backgroundColor: '#16A34A' },
  statusLabel: { color: '#334155', fontSize: 14, fontWeight: '800' },
  timer: { color: '#0F172A', fontSize: 38, fontWeight: '800', marginTop: 15, fontVariant: ['tabular-nums'] },
  timerCaption: { color: '#64748B', fontSize: 12, marginTop: 5 },
  readinessCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 16 },
  readyCard: { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' },
  blockedCard: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  readinessHeading: { flexDirection: 'row', alignItems: 'center' },
  readinessIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    color: '#166534',
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 17,
    fontWeight: '900',
  },
  readinessCopy: { flex: 1, marginLeft: 11 },
  readinessTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  readinessSubtitle: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 2 },
  blockerText: { color: '#9A3412', fontSize: 13, lineHeight: 20, marginTop: 8 },
  settingsButton: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, marginTop: 10 },
  settingsButtonText: { color: '#166534', fontSize: 12, fontWeight: '800' },
  primaryButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  actionStack: { marginTop: 18 },
  secondaryButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#15803D', fontSize: 16, fontWeight: '800' },
  checkoutButton: { alignItems: 'center', justifyContent: 'center', height: 50, marginTop: 8 },
  checkoutButtonText: { color: '#B91C1C', fontSize: 15, fontWeight: '800' },
  privacyNote: { marginTop: 24, paddingHorizontal: 4 },
  privacyTitle: { color: '#475569', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  privacyText: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
});
