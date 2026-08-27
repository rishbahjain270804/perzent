import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DeviceIntegrityService, WorkReadiness } from '../services/DeviceIntegrityService';
import { ApiError, EmployeeApi, isUnauthorizedError } from '../services/EmployeeApi';
import { AutoUpdateService } from '../services/AutoUpdateService';
import { WaypointQueueService } from '../services/WaypointQueueService';
import { BackgroundTrackingService } from '../services/BackgroundTrackingService';
import { SessionEvents } from '../services/SessionEvents';
import { DirectAccess } from '../services/DirectAccess';

type ShiftStatus = 'CHECKED_OUT' | 'CHECKED_IN' | 'ON_BREAK';
type ManagerTab = 'DUTY' | 'TEAM';
type PendingAction = 'CHECK_IN' | 'START_BREAK' | 'RESUME' | 'CHECK_OUT' | null;
type ShiftPolicy = { timezone: string; auto_checkout_time: string; max_break_minutes: number };

const DEFAULT_POLICY: ShiftPolicy = { timezone: 'Asia/Kolkata', auto_checkout_time: '23:40', max_break_minutes: 30 };
const READINESS_INTERVAL_MS = 15_000;
/** Every 4th readiness tick (60 s) the shift state is re-read from the server while a shift is open. */
const SERVER_SYNC_EVERY_TICKS = 4;
/** JS-side fallback ping; the native service is the primary tracker, so this only needs to be a safety net. */
const JS_PING_INTERVAL_MS = 2 * 60 * 1000;
/** The native service heartbeats telemetry every 45 s while tracking; the JS side only needs a slow backup cadence. */
const ON_DUTY_TELEMETRY_INTERVAL_MS = 2 * 60 * 1000;
const OFF_DUTY_TELEMETRY_INTERVAL_MS = 10 * 60 * 1000;
const PRIVACY_POLICY_URL = 'https://perzent.vercel.app/privacy';
/** Server codes that mean our local shift state drifted from the server's: re-sync after showing the error. */
const STATE_DRIFT_CODES = new Set(['NO_ACTIVE_SHIFT', 'SHIFT_ACTIVE', 'BREAK_ACTIVE', 'NO_ACTIVE_BREAK']);

const formatDuration = (totalSeconds: number) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const total = Math.floor(totalSeconds);
  const hours = Math.floor(total / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/** "23:40" -> "11:40 PM" */
const formatClockTime = (hhmm: string) => {
  const [h, m] = String(hhmm || '').split(':').map((part) => parseInt(part, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};

const normalizePolicy = (raw: any): ShiftPolicy => ({
  timezone: typeof raw?.timezone === 'string' && raw.timezone ? raw.timezone : DEFAULT_POLICY.timezone,
  auto_checkout_time:
    typeof raw?.auto_checkout_time === 'string' && raw.auto_checkout_time
      ? raw.auto_checkout_time
      : DEFAULT_POLICY.auto_checkout_time,
  max_break_minutes:
    Number.isFinite(Number(raw?.max_break_minutes)) && Number(raw.max_break_minutes) > 0
      ? Number(raw.max_break_minutes)
      : DEFAULT_POLICY.max_break_minutes,
});

const toShiftStatus = (status: unknown): ShiftStatus =>
  status === 'CHECKED_IN' ? 'CHECKED_IN' : status === 'ON_BREAK' ? 'ON_BREAK' : 'CHECKED_OUT';

export default function DutyDashboardScreen({
  session,
  deviceInfo,
  onLogout,
}: {
  session: any;
  deviceInfo?: any;
  onLogout: () => void;
}) {
  const isManager = session.role === 'MANAGER';
  const userId: string = session.user_id || session.id || '';
  const [activeTab, setActiveTab] = useState<ManagerTab>('DUTY');

  // Duty / Shift States
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>('CHECKED_OUT');
  const [alreadyCompletedToday, setAlreadyCompletedToday] = useState(false);
  const [punchInTimestamp, setPunchInTimestamp] = useState<number | null>(null);
  const [breakStartTimestamp, setBreakStartTimestamp] = useState<number | null>(null);
  const [totalBreakMinutes, setTotalBreakMinutes] = useState(0);
  const [policy, setPolicy] = useState<ShiftPolicy>(DEFAULT_POLICY);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [lastWaypointTime, setLastWaypointTime] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [breakTimerSec, setBreakTimerSec] = useState(DEFAULT_POLICY.max_break_minutes * 60);
  const [readiness, setReadiness] = useState<WorkReadiness | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [disclosureVisible, setDisclosureVisible] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Manager Team Tracking States
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [addEmployeeModalVisible, setAddEmployeeModalVisible] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpDesignation, setNewEmpDesignation] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [resettingMemberId, setResettingMemberId] = useState<string | null>(null);

  const shiftStatusRef = useRef<ShiftStatus>('CHECKED_OUT');
  const serverOffsetRef = useRef(0);
  const lastTelemetryPatchRef = useRef(0);
  const disclosureShownRef = useRef(false);
  const permissionAlertShownRef = useRef(false);
  const busy = pendingAction !== null;

  useEffect(() => {
    shiftStatusRef.current = shiftStatus;
  }, [shiftStatus]);

  const serverNow = () => Date.now() + serverOffsetRef.current;

  const applyServerTime = (serverTime: unknown) => {
    if (typeof serverTime !== 'string') return;
    const parsed = new Date(serverTime).getTime();
    if (!Number.isFinite(parsed)) return;
    serverOffsetRef.current = parsed - Date.now();
    setServerTimeOffset(serverOffsetRef.current);
  };

  /** Applies a GET /api/mobile/attendance payload to local state; returns the resolved status + punch-in time. */
  const applyAttendance = useCallback((data: any): { status: ShiftStatus; punchInAt: number | null } => {
    applyServerTime(data?.server_time);
    const status = toShiftStatus(data?.status);
    const nextPolicy = normalizePolicy(data?.policy);
    const now = Date.now() + serverOffsetRef.current;

    setPolicy(nextPolicy);
    setShiftStatus(status);
    setAlreadyCompletedToday(Boolean(data?.already_completed_today));
    setTotalBreakMinutes(Number(data?.total_break_minutes) || 0);

    let punchInAt: number | null = null;
    if (status !== 'CHECKED_OUT' && data?.punch_in_time) {
      punchInAt = new Date(data.punch_in_time).getTime();
      setPunchInTimestamp(punchInAt);
      setElapsedSec(Math.max(0, Math.floor((now - punchInAt) / 1000)));
    } else {
      setPunchInTimestamp(null);
      setElapsedSec(0);
    }

    if (status === 'ON_BREAK' && data?.active_break_started_at) {
      const breakStart = new Date(data.active_break_started_at).getTime();
      setBreakStartTimestamp(breakStart);
      setBreakTimerSec(Math.max(0, nextPolicy.max_break_minutes * 60 - Math.floor((now - breakStart) / 1000)));
    } else {
      setBreakStartTimestamp(null);
      setBreakTimerSec(nextPolicy.max_break_minutes * 60);
    }
    return { status, punchInAt };
  }, []);

  const refreshReadiness = useCallback(
    async (options: { forceUpload?: boolean } = {}) => {
      try {
        const next = await DeviceIntegrityService.inspect();
        setReadiness(next);
        // Telemetry cadence: every 15 s while a shift is open, at most every 10 min while off duty.
        const shiftOpen = shiftStatusRef.current !== 'CHECKED_OUT';
        const sinceLastPatch = Date.now() - lastTelemetryPatchRef.current;
        const due = sinceLastPatch >= (shiftOpen ? ON_DUTY_TELEMETRY_INTERVAL_MS : OFF_DUTY_TELEMETRY_INTERVAL_MS);
        if (options.forceUpload || due) {
          lastTelemetryPatchRef.current = Date.now();
          await EmployeeApi.telemetry(session, next.telemetry, deviceInfo).catch(() => undefined);
        }
        return next;
      } catch {
        return null;
      }
    },
    [deviceInfo, session]
  );

  /**
   * Makes the native service match the server's shift status and reacts to flags the
   * service raised while the JS side was asleep (401 / 409 / permission revoked).
   */
  const reconcileTracking = useCallback(
    async (status: ShiftStatus, punchInAt: number | null) => {
      const state = await BackgroundTrackingService.getState();
      if (state.auth_invalid) {
        await BackgroundTrackingService.clearFlags();
        await BackgroundTrackingService.stop();
        SessionEvents.emitUnauthorized();
        return;
      }
      if (state.shift_ended_remotely || state.permission_revoked) {
        await BackgroundTrackingService.clearFlags();
        if (state.permission_revoked && !permissionAlertShownRef.current) {
          permissionAlertShownRef.current = true;
          Alert.alert(
            'Location permission turned off',
            'Live location sharing stopped because location permission was revoked. Set it back to "Allow all the time" to continue your shift.'
          );
          refreshReadiness();
        }
      }
      const running = state.tracking_active && !state.shift_ended_remotely && !state.permission_revoked;
      if (status === 'CHECKED_IN') {
        if (!running) {
          const permission = await DeviceIntegrityService.getLocationPermissionState();
          if (permission.foreground) {
            await BackgroundTrackingService.start(session.token, userId, punchInAt ?? serverNow(), DirectAccess.config(session));
          }
        }
      } else if (running) {
        await BackgroundTrackingService.stop();
      }
    },
    [session, userId, refreshReadiness]
  );

  const syncAttendanceState = useCallback(async () => {
    try {
      const data = await EmployeeApi.shiftState(session);
      const applied = applyAttendance(data);
      await reconcileTracking(applied.status, applied.punchInAt);
    } catch (error: any) {
      console.warn('Background attendance sync skipped/retry:', error?.message || error);
    }
  }, [session, applyAttendance, reconcileTracking]);

  const loadManagerTeam = useCallback(async () => {
    if (!isManager) return;
    setTeamLoading(true);
    try {
      const team = await EmployeeApi.getManagerTeam(session);
      if (Array.isArray(team)) {
        setTeamMembers(team);
      }
    } catch {
      // Silent; the pull-to-refresh spinner already signals the retry path.
    } finally {
      setTeamLoading(false);
    }
  }, [isManager, session]);

  // Mount: sync shift state, inspect the device, and show the location disclosure once if needed.
  useEffect(() => {
    let mounted = true;
    (async () => {
      await syncAttendanceState();
      await refreshReadiness({ forceUpload: true });
      if (isManager) loadManagerTeam();
      const permission = await DeviceIntegrityService.getLocationPermissionState();
      if (mounted && !permission.complete && !disclosureShownRef.current) {
        disclosureShownRef.current = true;
        setDisclosureVisible(true);
      }
    })();

    let ticks = 0;
    const timer = setInterval(async () => {
      ticks += 1;
      refreshReadiness();
      if (isManager) loadManagerTeam();
      const state = await BackgroundTrackingService.getState();
      // Re-sync with the server when the native service raised a flag, and periodically while a shift is
      // open so changes made elsewhere (manager check-out, kiosk, auto policies) reach the screen.
      const periodicDue = shiftStatusRef.current !== 'CHECKED_OUT' && ticks % SERVER_SYNC_EVERY_TICKS === 0;
      if (state.auth_invalid || state.shift_ended_remotely || state.permission_revoked || periodicDue) {
        syncAttendanceState();
      }
    }, READINESS_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [syncAttendanceState, refreshReadiness, isManager, loadManagerTeam]);

  // AppState listener: re-sync attendance, reconcile the native service and re-inspect on resume.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        syncAttendanceState();
        refreshReadiness();
        if (isManager) loadManagerTeam();
      }
    });
    return () => subscription.remove();
  }, [syncAttendanceState, refreshReadiness, isManager, loadManagerTeam]);

  // 1-second clock. The persistent notification is owned by the native service (refreshes itself every 15 s).
  useEffect(() => {
    if (shiftStatus !== 'CHECKED_IN' && shiftStatus !== 'ON_BREAK') return;
    const tick = () => {
      const now = Date.now() + serverTimeOffset;
      if (punchInTimestamp && shiftStatus === 'CHECKED_IN') {
        setElapsedSec(Math.max(0, Math.floor((now - punchInTimestamp) / 1000)));
      }
      if (breakStartTimestamp && shiftStatus === 'ON_BREAK') {
        const used = Math.floor((now - breakStartTimestamp) / 1000);
        setBreakTimerSec(Math.max(0, policy.max_break_minutes * 60 - used));
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [shiftStatus, punchInTimestamp, breakStartTimestamp, serverTimeOffset, policy.max_break_minutes]);

  // JS-side 15 s waypoint ping while checked in (complements the native service; offline-queued).
  useEffect(() => {
    if (shiftStatus !== 'CHECKED_IN') return;
    let cancelled = false;
    const pingLocation = async () => {
      try {
        const pos = await EmployeeApi.currentPosition();
        const result = await WaypointQueueService.recordPosition(session, pos);
        if (cancelled) return;
        if (result.outcome === 'NO_ACTIVE_SHIFT') {
          await BackgroundTrackingService.stop();
          syncAttendanceState();
          return;
        }
        if (result.outcome === 'AUTH_INVALID') return;
        setLastWaypointTime(Date.now());
      } catch {
        // GPS unavailable right now; the stalled banner covers the user-facing side.
      }
    };
    pingLocation();
    const locInterval = setInterval(pingLocation, JS_PING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(locInterval);
    };
  }, [shiftStatus, session, syncAttendanceState]);

  const isGpsStalled = Boolean(
    shiftStatus === 'CHECKED_IN' &&
    lastWaypointTime !== null &&
    Date.now() - lastWaypointTime > 120_000
  );

  const showActionError = (title: string, error: unknown) => {
    if (isUnauthorizedError(error)) return; // App.tsx is already returning to Login.
    const message = error instanceof Error && error.message ? error.message : 'The app hit an unexpected problem. Please try again.';
    Alert.alert(title, message);
    if (error instanceof ApiError && error.code && STATE_DRIFT_CODES.has(error.code)) {
      syncAttendanceState();
    }
  };

  /** Location permission (incl. "Allow all the time" on Android 10+) and notifications must be in place before duty. */
  const ensurePermissionsForDuty = async (): Promise<boolean> => {
    const permission = await DeviceIntegrityService.getLocationPermissionState();
    if (!permission.complete) {
      setDisclosureVisible(true);
      return false;
    }
    await DeviceIntegrityService.ensureNotificationPermission();
    return true;
  };

  const verifiedReadiness = async () => {
    const next = await DeviceIntegrityService.inspect({ acquirePosition: true });
    setReadiness(next);
    lastTelemetryPatchRef.current = Date.now();
    await EmployeeApi.telemetry(session, next.telemetry, deviceInfo).catch(() => undefined);
    if (!next.ready || !next.position) {
      const message = next.blockers.map((item) => `• ${item.message}`).join('\n');
      Alert.alert('Check-in blocked', message || 'A verified GPS position is required.');
      return null;
    }
    return next;
  };

  const handleCheckIn = async () => {
    if (busy) return;
    setPendingAction('CHECK_IN');
    try {
      if (!(await ensurePermissionsForDuty())) return;
      const verified = await verifiedReadiness();
      if (!verified?.position) return;
      const result = await EmployeeApi.attendance(session, 'POST', {
        action: 'check_in',
        latitude: verified.position.latitude,
        longitude: verified.position.longitude,
        accuracy: verified.position.accuracy ?? 10,
        integrity: verified.telemetry,
      });
      applyServerTime(result?.server_time);
      const punchTime = result?.punch_in_time ? new Date(result.punch_in_time).getTime() : serverNow();
      setPunchInTimestamp(punchTime);
      setElapsedSec(Math.max(0, Math.floor((serverNow() - punchTime) / 1000)));
      setBreakStartTimestamp(null);
      setLastWaypointTime(Date.now());
      setAlreadyCompletedToday(false);
      setShiftStatus(toShiftStatus(result?.status) === 'CHECKED_OUT' ? 'CHECKED_IN' : toShiftStatus(result?.status));
      await BackgroundTrackingService.start(session.token, userId, punchTime, DirectAccess.config(session));
      Alert.alert(
        'Shift started',
        'Your location and attendance were verified. Live location sharing stays on until you start a break or check out.'
      );
    } catch (error) {
      showActionError('Check-in failed', error);
    } finally {
      setPendingAction(null);
    }
  };

  const handleCheckOut = () => {
    if (busy) return;
    Alert.alert('End shift?', 'Your checkout location will be verified before the shift ends.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check out',
        style: 'destructive',
        onPress: async () => {
          setPendingAction('CHECK_OUT');
          try {
            const position = await EmployeeApi.currentPosition();
            // Drain every queued batch before the shift closes (409 afterwards would drop them).
            const flush = await WaypointQueueService.flushQueue(session, { force: true });
            if (flush.outcome === 'AUTH_INVALID') return;
            const result = await EmployeeApi.attendance(session, 'POST', {
              action: 'check_out',
              latitude: position.latitude,
              longitude: position.longitude,
              accuracy: position.accuracy,
            });
            applyServerTime(result?.server_time);
            await BackgroundTrackingService.stop();
            await WaypointQueueService.clear();
            setShiftStatus('CHECKED_OUT');
            setAlreadyCompletedToday(true);
            setPunchInTimestamp(null);
            setBreakStartTimestamp(null);
            setLastWaypointTime(null);
            setElapsedSec(0);
            syncAttendanceState();
          } catch (error) {
            showActionError('Check-out failed', error);
          } finally {
            setPendingAction(null);
          }
        },
      },
    ]);
  };

  const handleStartBreak = () => {
    if (busy) return;
    Alert.alert(
      'Start break?',
      `Location sharing pauses during your break. Breaks are limited to ${policy.max_break_minutes} minutes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start break',
          onPress: async () => {
            setPendingAction('START_BREAK');
            try {
              const result = await EmployeeApi.attendance(session, 'POST', { action: 'start_break', break_type: 'GENERAL' });
              applyServerTime(result?.server_time);
              // Tracking really pauses: native service + JS pinger both stop.
              await BackgroundTrackingService.stop();
              await WaypointQueueService.flushQueue(session, { force: true }).catch(() => undefined);
              const breakStart = result?.active_break_started_at
                ? new Date(result.active_break_started_at).getTime()
                : serverNow();
              setBreakStartTimestamp(breakStart);
              setBreakTimerSec(policy.max_break_minutes * 60);
              setShiftStatus('ON_BREAK');
            } catch (error) {
              showActionError('Break failed', error);
            } finally {
              setPendingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleResume = async () => {
    if (busy) return;
    setPendingAction('RESUME');
    try {
      if (!(await ensurePermissionsForDuty())) return;
      const verified = await verifiedReadiness();
      if (!verified) return;
      const result = await EmployeeApi.attendance(session, 'POST', { action: 'resume', integrity: verified.telemetry });
      applyServerTime(result?.server_time);
      const punchTime = result?.punch_in_time
        ? new Date(result.punch_in_time).getTime()
        : punchInTimestamp ?? serverNow();
      setPunchInTimestamp(punchTime);
      setBreakStartTimestamp(null);
      setLastWaypointTime(Date.now());
      setShiftStatus('CHECKED_IN');
      await BackgroundTrackingService.start(session.token, userId, punchTime, DirectAccess.config(session));
    } catch (error) {
      showActionError('Resume failed', error);
    } finally {
      setPendingAction(null);
    }
  };

  const handleDisclosureContinue = async () => {
    if (requestingPermission) return;
    setRequestingPermission(true);
    try {
      const permission = await DeviceIntegrityService.requestLocationPermissions();
      if (permission.complete) {
        setDisclosureVisible(false);
      } else {
        setDisclosureVisible(false);
        Alert.alert(
          'One more step',
          permission.foreground
            ? 'Open app settings and set Location permission to "Allow all the time" so tracking keeps working while the app is in the background.'
            : 'Location permission was not granted. You can enable it in app settings when you are ready to start a shift.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open settings', onPress: () => DeviceIntegrityService.openAppSettings() },
          ]
        );
      }
      refreshReadiness();
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleManualUpdateCheck = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      await AutoUpdateService.manualCheck();
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmpName.trim() || !newEmpPhone.trim() || !newEmpPassword.trim()) {
      Alert.alert('Validation Error', 'Full name, 10-digit mobile number, and password are required.');
      return;
    }
    if (newEmpPassword.trim().length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }
    if (addingEmployee) return;
    setAddingEmployee(true);
    try {
      await EmployeeApi.addEmployee(session, {
        full_name: newEmpName.trim(),
        phone: newEmpPhone.trim(),
        password: newEmpPassword.trim(),
        designation: newEmpDesignation.trim() || 'Field Staff',
      });
      Alert.alert('Success', `Employee ${newEmpName} has been added successfully.`);
      setAddEmployeeModalVisible(false);
      setNewEmpName('');
      setNewEmpPhone('');
      setNewEmpPassword('');
      setNewEmpDesignation('');
      loadManagerTeam();
    } catch (error) {
      showActionError('Could not add employee', error);
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleResetDevice = (memberId: string, memberName: string) => {
    if (resettingMemberId) return;
    Alert.alert(
      'Reset Device Binding?',
      `Are you sure you want to reset device binding for ${memberName}? They will be able to log in on a new device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Device',
          style: 'destructive',
          onPress: async () => {
            setResettingMemberId(memberId);
            try {
              await EmployeeApi.resetDeviceBinding(session, memberId);
              Alert.alert('Device Reset', `Device binding for ${memberName} was reset.`);
              loadManagerTeam();
            } catch (error) {
              showActionError('Error', error);
            } finally {
              setResettingMemberId(null);
            }
          },
        },
      ]
    );
  };

  const statusLabel = shiftStatus === 'CHECKED_IN'
    ? 'On duty'
    : shiftStatus === 'ON_BREAK'
      ? 'On break'
      : alreadyCompletedToday
        ? 'Shift completed'
        : 'Not checked in';

  const timerCaption = shiftStatus === 'ON_BREAK'
    ? breakTimerSec > 0
      ? `Break time remaining (max ${policy.max_break_minutes} min)`
      : 'Break limit reached - please resume your shift'
    : shiftStatus === 'CHECKED_IN'
      ? `Shift duration • Auto check-out at ${formatClockTime(policy.auto_checkout_time)}`
      : 'Shift duration (Server Synced)';

  const hasPermissionBlocker = Boolean(readiness?.blockers.some((item) => item.code === 'LOCATION_PERMISSION'));
  const onDutyCount = teamMembers.filter((m) => m.shift_status === 'CHECKED_IN').length;
  const stalledCount = teamMembers.filter((m) => m.is_gps_disconnected).length;

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        isManager ? (
          <RefreshControl refreshing={teamLoading} onRefresh={loadManagerTeam} colors={['#16A34A']} />
        ) : undefined
      }
    >
      <View style={styles.header}>
        <View style={styles.brandMark}><Text style={styles.brandLetter}>P</Text></View>
        <View style={styles.identity}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{session.full_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{isManager ? 'Manager & Employee' : session.designation || 'Employee'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton} disabled={busy}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Manager Tab Switcher */}
      {isManager && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'DUTY' && styles.tabButtonActive]}
            onPress={() => setActiveTab('DUTY')}
          >
            <Text style={[styles.tabText, activeTab === 'DUTY' && styles.tabTextActive]}>My Shift Duty</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'TEAM' && styles.tabButtonActive]}
            onPress={() => setActiveTab('TEAM')}
          >
            <Text style={[styles.tabText, activeTab === 'TEAM' && styles.tabTextActive]}>
              My Team ({teamMembers.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- TAB 1: MY DUTY & SHIFT --- */}
      {(!isManager || activeTab === 'DUTY') && (
        <View>
          {/* 2-Minute GPS / Mobile Internet Stalled Warning */}
          {isGpsStalled && (
            <View style={styles.gpsWarningCard}>
              <Text style={styles.gpsWarningTitle}>⚠️ GPS / Location Disconnected (&gt;2 min)</Text>
              <Text style={styles.gpsWarningText}>
                No location update received for over 2 minutes. Ensure Location (GPS) and Mobile Internet remain ON while on duty.
              </Text>
            </View>
          )}

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  shiftStatus === 'CHECKED_IN' && styles.statusDotActive,
                  shiftStatus === 'CHECKED_OUT' && alreadyCompletedToday && styles.statusDotCompleted,
                ]}
              />
              <Text style={styles.statusLabel}>{statusLabel}</Text>
            </View>
            <Text style={styles.timer}>
              {shiftStatus === 'ON_BREAK'
                ? formatDuration(breakTimerSec)
                : shiftStatus === 'CHECKED_IN'
                  ? formatDuration(elapsedSec)
                  : '00:00:00'}
            </Text>
            <Text style={styles.timerCaption}>{timerCaption}</Text>
          </View>

          {shiftStatus === 'CHECKED_OUT' && alreadyCompletedToday && (
            <View style={styles.completedCard}>
              <Text style={styles.completedIcon}>✅</Text>
              <Text style={styles.completedTitle}>Shift completed for today</Text>
              <Text style={styles.completedSubtitle}>
                Breaks used: {totalBreakMinutes} min • Shifts auto-close at {formatClockTime(policy.auto_checkout_time)}.
                You can still start another shift if your manager needs you.
              </Text>
            </View>
          )}

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
            {hasPermissionBlocker && (
              <TouchableOpacity style={styles.settingsButton} onPress={() => setDisclosureVisible(true)}>
                <Text style={styles.settingsButtonText}>Enable location sharing</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* When Checked Out: Show Check In Button */}
          {shiftStatus === 'CHECKED_OUT' && (
            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              onPress={handleCheckIn}
              disabled={busy}
            >
              {pendingAction === 'CHECK_IN' ? (
                <View style={styles.buttonRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Verifying…</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>{alreadyCompletedToday ? 'Start Another Shift' : 'Check in'}</Text>
              )}
            </TouchableOpacity>
          )}

          {/* When Checked In: Show Break & Check Out buttons */}
          {shiftStatus === 'CHECKED_IN' && (
            <View style={styles.actionStack}>
              <TouchableOpacity
                style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                onPress={handleStartBreak}
                disabled={busy}
              >
                {pendingAction === 'START_BREAK' ? (
                  <View style={styles.buttonRow}>
                    <ActivityIndicator color="#15803D" />
                    <Text style={styles.secondaryButtonText}>Starting break…</Text>
                  </View>
                ) : (
                  <Text style={styles.secondaryButtonText}>Start break</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.checkoutButton, busy && styles.buttonDisabled]}
                onPress={handleCheckOut}
                disabled={busy}
              >
                {pendingAction === 'CHECK_OUT' ? (
                  <View style={styles.buttonRow}>
                    <ActivityIndicator color="#B91C1C" />
                    <Text style={styles.checkoutButtonText}>Checking out…</Text>
                  </View>
                ) : (
                  <Text style={styles.checkoutButtonText}>Check out</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* When On Break: Show Resume Button */}
          {shiftStatus === 'ON_BREAK' && (
            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              onPress={handleResume}
              disabled={busy}
            >
              {pendingAction === 'RESUME' ? (
                <View style={styles.buttonRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Verifying…</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Resume shift</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.privacyNote}>
            <Text style={styles.privacyTitle}>Privacy during work</Text>
            <Text style={styles.privacyText}>
              Your precise location is shared with your employer only while you are checked in. Sharing pauses on breaks and stops at check-out. Device compliance details are visible only to authorized management.
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => undefined)}>
              <Text style={styles.privacyLink}>Read the privacy policy</Text>
            </TouchableOpacity>
          </View>

          {/* App Version & Manual Update Card */}
          <View style={styles.appVersionCard}>
            <View style={styles.appVersionInfo}>
              <Text style={styles.appVersionTitle}>Perzent Workforce</Text>
              <Text style={styles.appVersionSubtitle}>
                Version {AutoUpdateService.getCurrentVersion().version} (Build #{AutoUpdateService.getCurrentVersion().versionCode})
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.checkUpdateButton, checkingUpdate && styles.buttonDisabled]}
              onPress={handleManualUpdateCheck}
              disabled={checkingUpdate}
            >
              {checkingUpdate ? (
                <ActivityIndicator size="small" color="#166534" />
              ) : (
                <Text style={styles.checkUpdateButtonText}>Check for Updates</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* --- TAB 2: MANAGER TEAM TRACKING & ADD EMPLOYEE --- */}
      {isManager && activeTab === 'TEAM' && (
        <View style={styles.teamContainer}>
          <TouchableOpacity
            style={styles.addEmployeeTopButton}
            onPress={() => setAddEmployeeModalVisible(true)}
          >
            <Text style={styles.addEmployeeTopButtonText}>+ Add New Team Employee</Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{teamMembers.length}</Text>
              <Text style={styles.statLabel}>Total Staff</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxGreen]}>
              <Text style={[styles.statNumber, { color: '#16A34A' }]}>{onDutyCount}</Text>
              <Text style={styles.statLabel}>On Duty Now</Text>
            </View>
            <View style={[styles.statBox, stalledCount > 0 && styles.statBoxAmber]}>
              <Text style={[styles.statNumber, { color: stalledCount > 0 ? '#D97706' : '#64748B' }]}>{stalledCount}</Text>
              <Text style={styles.statLabel}>GPS Disconnected</Text>
            </View>
          </View>

          <Text style={styles.sectionHeader}>Field Team ({teamMembers.length})</Text>
          {teamMembers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No employees assigned to you yet.</Text>
              <Text style={styles.emptyCardSubtext}>Tap "+ Add New Team Employee" above to add your first staff member.</Text>
            </View>
          ) : (
            teamMembers.map((member) => {
              const isOnDuty = member.shift_status === 'CHECKED_IN';
              const isOnBreak = member.shift_status === 'ON_BREAK';
              const isDisconnected = member.is_gps_disconnected;
              const isResetting = resettingMemberId === member.user_id;

              return (
                <View key={member.user_id} style={styles.memberCard}>
                  <View style={styles.memberHeader}>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.full_name}</Text>
                      <Text style={styles.memberDesignation}>{member.designation || 'Staff'} • {member.department_name || 'Field'}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isOnDuty && !isDisconnected && styles.badgeDuty,
                        isOnBreak && styles.badgeBreak,
                        !isOnDuty && !isOnBreak && styles.badgeOff,
                        isDisconnected && styles.badgeAlert,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isOnDuty && !isDisconnected && styles.textDuty,
                          isOnBreak && styles.textBreak,
                          !isOnDuty && !isOnBreak && styles.textOff,
                          isDisconnected && styles.textAlert,
                        ]}
                      >
                        {isDisconnected ? 'GPS Disconnected' : isOnDuty ? 'On Duty' : isOnBreak ? 'On Break' : 'Off Duty'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberDetails}>
                    <Text style={styles.memberDetailRow}>
                      📍 <Text style={styles.detailLabel}>Location:</Text> {member.current_location?.address_name || 'No GPS ping received'}
                    </Text>
                    {member.battery_level != null && (
                      <Text style={styles.memberDetailRow}>
                        🔋 <Text style={styles.detailLabel}>Battery:</Text> {member.battery_level}%
                      </Text>
                    )}
                    <Text style={styles.memberDetailRow}>
                      📱 <Text style={styles.detailLabel}>Device:</Text> {member.device_model || 'Not bound yet'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.resetBindingButton, (isResetting || Boolean(resettingMemberId)) && styles.buttonDisabled]}
                    onPress={() => handleResetDevice(member.user_id, member.full_name)}
                    disabled={Boolean(resettingMemberId)}
                  >
                    {isResetting ? (
                      <View style={styles.buttonRow}>
                        <ActivityIndicator size="small" color="#475569" />
                        <Text style={styles.resetBindingText}>Resetting…</Text>
                      </View>
                    ) : (
                      <Text style={styles.resetBindingText}>Reset Phone Binding</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Modal: Add Employee */}
      <Modal
        visible={addEmployeeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !addingEmployee && setAddEmployeeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Team Employee</Text>
            <Text style={styles.modalSubtitle}>Create an employee under your supervision</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Full Name (e.g. John Doe)"
              placeholderTextColor="#94A3B8"
              value={newEmpName}
              onChangeText={setNewEmpName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="10-digit Phone Number"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={newEmpPhone}
              onChangeText={setNewEmpPhone}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="App Login Password (min 6 characters)"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={newEmpPassword}
              onChangeText={setNewEmpPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Designation (e.g. Field Executive)"
              placeholderTextColor="#94A3B8"
              value={newEmpDesignation}
              onChangeText={setNewEmpDesignation}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setAddEmployeeModalVisible(false)}
                disabled={addingEmployee}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, addingEmployee && styles.buttonDisabled]}
                onPress={handleCreateEmployee}
                disabled={addingEmployee}
              >
                {addingEmployee ? (
                  <View style={styles.buttonRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.modalSubmitText}>Creating…</Text>
                  </View>
                ) : (
                  <Text style={styles.modalSubmitText}>Create Employee</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Prominent disclosure (Google Play background-location policy): shown BEFORE any permission prompt. */}
      <Modal
        visible={disclosureVisible}
        animationType="slide"
        onRequestClose={() => !requestingPermission && setDisclosureVisible(false)}
      >
        <ScrollView contentContainerStyle={styles.disclosurePage}>
          <View style={styles.permIconCircle}>
            <Text style={styles.permIcon}>📍</Text>
          </View>
          <Text style={styles.permTitle}>Location sharing while on duty</Text>
          <Text style={styles.permDescription}>
            Perzent collects your precise location in the background only while you are checked in to a shift.
          </Text>
          <View style={styles.permStepBox}>
            <Text style={styles.permStepText}>• A persistent notification is shown the whole time location sharing is on.</Text>
            <Text style={styles.permStepText}>• Sharing pauses when you start a break and stops when you check out.</Text>
            <Text style={styles.permStepText}>• Your location data is sent to your employer for attendance and route records.</Text>
            <Text style={styles.permStepText}>
              • Android will ask you to choose <Text style={styles.permStepStrong}>"Allow all the time"</Text> so tracking keeps working when the app is in the background.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.permActionButton, requestingPermission && styles.buttonDisabled]}
            onPress={handleDisclosureContinue}
            disabled={requestingPermission}
          >
            {requestingPermission ? (
              <View style={styles.buttonRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.permActionText}>Waiting for permission…</Text>
              </View>
            ) : (
              <Text style={styles.permActionText}>Continue</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permSecondaryButton}
            onPress={() => setDisclosureVisible(false)}
            disabled={requestingPermission}
          >
            <Text style={styles.permSecondaryText}>Not now</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => undefined)}>
            <Text style={styles.privacyLink}>Privacy policy</Text>
          </TouchableOpacity>
          <Text style={styles.permFootnote}>
            You can check in only after location access is set to "Allow all the time". You can still log out or use the rest of the app without it.
          </Text>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#F8FAFC', padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
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
  roleBadge: { backgroundColor: '#E2E8F0', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  roleBadgeText: { color: '#334155', fontSize: 11, fontWeight: '700' },
  logoutButton: { paddingVertical: 9, paddingHorizontal: 12 },
  logoutText: { color: '#475569', fontWeight: '700' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  gpsWarningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  gpsWarningTitle: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  gpsWarningText: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 17,
  },
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
  statusDotCompleted: { backgroundColor: '#3B82F6' },
  statusLabel: { color: '#334155', fontSize: 14, fontWeight: '800' },
  timer: { color: '#0F172A', fontSize: 38, fontWeight: '800', marginTop: 15, fontVariant: ['tabular-nums'] },
  timerCaption: { color: '#64748B', fontSize: 12, marginTop: 5, textAlign: 'center' },
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
  completedCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 18,
  },
  completedIcon: { fontSize: 28, marginBottom: 8 },
  completedTitle: { color: '#1E40AF', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  completedSubtitle: { color: '#3B82F6', fontSize: 12, textAlign: 'center', lineHeight: 18 },
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
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  privacyLink: { color: '#166534', fontSize: 12, fontWeight: '800', marginTop: 8, textDecorationLine: 'underline' },

  // Team styles
  teamContainer: { marginTop: 4 },
  addEmployeeTopButton: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addEmployeeTopButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    alignItems: 'center',
  },
  statBoxGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statBoxAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardText: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 4 },
  emptyCardSubtext: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  memberInfo: { flex: 1, marginRight: 8 },
  memberName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  memberDesignation: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  badgeDuty: { backgroundColor: '#DCFCE7' },
  textDuty: { color: '#166534', fontSize: 11, fontWeight: '800' },
  badgeBreak: { backgroundColor: '#FEF3C7' },
  textBreak: { color: '#92400E', fontSize: 11, fontWeight: '800' },
  badgeOff: { backgroundColor: '#F1F5F9' },
  textOff: { color: '#475569', fontSize: 11, fontWeight: '800' },
  badgeAlert: { backgroundColor: '#FEE2E2' },
  textAlert: { color: '#991B1B', fontSize: 11, fontWeight: '800' },
  memberDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 4,
    marginBottom: 10,
  },
  memberDetailRow: { fontSize: 12, color: '#334155', lineHeight: 17 },
  detailLabel: { fontWeight: '700' },
  resetBindingButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  resetBindingText: { fontSize: 11, fontWeight: '700', color: '#475569' },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
  },
  modalSubmitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  // Location disclosure (full-screen, dismissible)
  disclosurePage: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  permIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permIcon: { fontSize: 32 },
  permTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  permDescription: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },
  permStepBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  permStepText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 6,
  },
  permStepStrong: { fontWeight: '800', color: '#166534' },
  permActionButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  permActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  permSecondaryButton: {
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  permSecondaryText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  permFootnote: { color: '#94A3B8', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 14 },
  appVersionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appVersionInfo: { flex: 1, marginRight: 10 },
  appVersionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  appVersionSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  checkUpdateButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    minWidth: 130,
    alignItems: 'center',
  },
  checkUpdateButtonText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '800',
  },
});
