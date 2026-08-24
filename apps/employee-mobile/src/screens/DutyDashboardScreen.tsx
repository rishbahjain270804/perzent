import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
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
import { EmployeeApi } from '../services/EmployeeApi';
import { AutoUpdateService } from '../services/AutoUpdateService';
import { ShiftNotificationService } from '../services/ShiftNotificationService';

type ShiftStatus = 'CHECKED_OUT' | 'CHECKED_IN' | 'ON_BREAK';
type ManagerTab = 'DUTY' | 'TEAM';

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
  const [activeTab, setActiveTab] = useState<ManagerTab>('DUTY');

  // Duty / Shift States
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>('CHECKED_OUT');
  const [alreadyCompletedToday, setAlreadyCompletedToday] = useState(false);
  const [punchInTimestamp, setPunchInTimestamp] = useState<number | null>(null);
  const [breakStartTimestamp, setBreakStartTimestamp] = useState<number | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [lastWaypointTime, setLastWaypointTime] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [breakTimerSec, setBreakTimerSec] = useState(1800);
  const [readiness, setReadiness] = useState<WorkReadiness | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Manager Team Tracking States
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [addEmployeeModalVisible, setAddEmployeeModalVisible] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpDesignation, setNewEmpDesignation] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);

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

  const formatDuration = (totalSeconds: number) => {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00:00';
    const total = Math.floor(totalSeconds);
    const hours = Math.floor(total / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
    const seconds = (total % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const updateClocks = useCallback(() => {
    const currentServerNow = Date.now() + serverTimeOffset;
    if (punchInTimestamp && shiftStatus === 'CHECKED_IN') {
      const sec = Math.max(0, Math.floor((currentServerNow - punchInTimestamp) / 1000));
      setElapsedSec(sec);
      ShiftNotificationService.updateLiveNotification(formatDuration(sec), 'CHECKED_IN');
    }
    if (breakStartTimestamp && shiftStatus === 'ON_BREAK') {
      const used = Math.floor((currentServerNow - breakStartTimestamp) / 1000);
      setBreakTimerSec(Math.max(0, 1800 - used));
      ShiftNotificationService.updateLiveNotification(formatDuration(used), 'ON_BREAK');
    }
  }, [punchInTimestamp, breakStartTimestamp, shiftStatus, serverTimeOffset]);

  const syncAttendanceState = useCallback(() => {
    return EmployeeApi.attendance(session)
      .then((data) => {
        if (data.server_time) {
          const offset = new Date(data.server_time).getTime() - Date.now();
          setServerTimeOffset(offset);
        }
        const status = data.status === 'AUTO_CHECKED_OUT' ? 'CHECKED_OUT' : data.status;
        setShiftStatus(status);
        setAlreadyCompletedToday(Boolean(data.already_completed_today));

        if (data.punch_in_time) {
          const t = new Date(data.punch_in_time).getTime();
          setPunchInTimestamp(t);
          const currentServerNow = Date.now() + (data.server_time ? new Date(data.server_time).getTime() - Date.now() : 0);
          setElapsedSec(Math.max(0, Math.floor((currentServerNow - t) / 1000)));
        }
        if (data.active_break_started_at) {
          const bt = new Date(data.active_break_started_at).getTime();
          setBreakStartTimestamp(bt);
          const currentServerNow = Date.now() + (data.server_time ? new Date(data.server_time).getTime() - Date.now() : 0);
          const used = Math.floor((currentServerNow - bt) / 1000);
          setBreakTimerSec(Math.max(0, 1800 - used));
        }
      })
      .catch((error) => Alert.alert('Sync failed', error.message));
  }, [session]);

  const loadManagerTeam = useCallback(async () => {
    if (!isManager) return;
    setTeamLoading(true);
    try {
      const team = await EmployeeApi.getManagerTeam(session);
      if (Array.isArray(team)) {
        setTeamMembers(team);
      }
    } catch (err: any) {
      // Silent or toast
    } finally {
      setTeamLoading(false);
    }
  }, [isManager, session]);

  useEffect(() => {
    syncAttendanceState();
    refreshReadiness(true);
    if (isManager) loadManagerTeam();

    const complianceTimer = setInterval(() => {
      refreshReadiness(true);
      if (isManager) loadManagerTeam();
    }, 15_000);
    return () => clearInterval(complianceTimer);
  }, [syncAttendanceState, refreshReadiness, isManager, loadManagerTeam]);

  // AppState listener: immediately re-sync server attendance & re-compute clocks when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        syncAttendanceState();
        updateClocks();
        refreshReadiness(true);
        if (isManager) loadManagerTeam();
      }
    });
    return () => subscription.remove();
  }, [syncAttendanceState, updateClocks, refreshReadiness, isManager, loadManagerTeam]);

  // Real-time ticking clock based on absolute time differences
  useEffect(() => {
    if (shiftStatus !== 'CHECKED_IN' && shiftStatus !== 'ON_BREAK') return;
    updateClocks();
    const timer = setInterval(updateClocks, 1000);
    return () => clearInterval(timer);
  }, [shiftStatus, updateClocks]);

  // High-frequency 15-second background waypoint ping while checked in with 2-minute stall tracking
  useEffect(() => {
    if (shiftStatus !== 'CHECKED_IN') return;
    const pingLocation = async () => {
      try {
        const pos = await EmployeeApi.currentPosition();
        await EmployeeApi.sendWaypoint(session, pos);
        setLastWaypointTime(Date.now());
      } catch {
        // Silent failure for transient background blips
      }
    };
    pingLocation();
    const locInterval = setInterval(pingLocation, 15_000);

    return () => clearInterval(locInterval);
  }, [shiftStatus, session]);

  const isGpsStalled = Boolean(
    shiftStatus === 'CHECKED_IN' &&
    lastWaypointTime !== null &&
    Date.now() - lastWaypointTime > 120_000
  );

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
    if (alreadyCompletedToday) {
      Alert.alert('Shift limit reached', 'You have already completed your shift for today (IST limit: 1 check-in per day).');
      return;
    }
    setActionLoading(true);
    try {
      const verified = await verifiedReadiness();
      if (!verified?.position) return;
      const result = await EmployeeApi.attendance(session, 'POST', {
        action: 'check_in',
        ...verified.position,
        integrity: verified.telemetry,
      });
      const punchTime = result.punch_in_time ? new Date(result.punch_in_time).getTime() : Date.now();
      setPunchInTimestamp(punchTime);
      setLastWaypointTime(Date.now());
      const initialSec = Math.max(0, Math.floor((Date.now() - punchTime) / 1000));
      setElapsedSec(initialSec);
      setShiftStatus(result.status);
      ShiftNotificationService.updateLiveNotification(formatDuration(initialSec), 'CHECKED_IN');
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
            await ShiftNotificationService.dismiss();
            setShiftStatus('CHECKED_OUT');
            setAlreadyCompletedToday(true);
            setPunchInTimestamp(null);
            setBreakStartTimestamp(null);
            setLastWaypointTime(null);
            setElapsedSec(0);
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
            const result = await EmployeeApi.attendance(session, 'POST', { action: 'start_break' });
            setShiftStatus('ON_BREAK');
            const bt = result.break_start_time ? new Date(result.break_start_time).getTime() : Date.now();
            setBreakStartTimestamp(bt);
            setBreakTimerSec(1800);
            ShiftNotificationService.updateLiveNotification('00:00:00', 'ON_BREAK');
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
      setBreakStartTimestamp(null);
      setLastWaypointTime(Date.now());
      ShiftNotificationService.updateLiveNotification(formatDuration(elapsedSec), 'CHECKED_IN');
    } catch (error: any) {
      Alert.alert('Resume failed', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmpName.trim() || !newEmpPhone.trim() || !newEmpPassword.trim()) {
      Alert.alert('Validation Error', 'Full name, 10-digit mobile number, and password are required.');
      return;
    }
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
    } catch (err: any) {
      Alert.alert('Could not add employee', err.message);
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleResetDevice = (memberId: string, memberName: string) => {
    Alert.alert(
      'Reset Device Binding?',
      `Are you sure you want to reset device binding for ${memberName}? They will be able to log in on a new device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Device',
          style: 'destructive',
          onPress: async () => {
            try {
              await EmployeeApi.resetDeviceBinding(session, memberId);
              Alert.alert('Device Reset', `Device binding for ${memberName} was reset.`);
              loadManagerTeam();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
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
      : alreadyCompletedToday
        ? 'Shift completed'
        : 'Not checked in';

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
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
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
                  alreadyCompletedToday && styles.statusDotCompleted,
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
            <Text style={styles.timerCaption}>
              {shiftStatus === 'ON_BREAK' ? 'Break time remaining' : 'Shift duration (Server Synced)'}
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
              <TouchableOpacity style={styles.settingsButton} onPress={() => DeviceIntegrityService.requestAlwaysPermission()}>
                <Text style={styles.settingsButtonText}>Enable "Allow all the time"</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* When Already Completed Today: Show Completed Card */}
          {shiftStatus === 'CHECKED_OUT' && alreadyCompletedToday && (
            <View style={styles.completedCard}>
              <Text style={styles.completedIcon}>✅</Text>
              <Text style={styles.completedTitle}>Shift Completed for Today</Text>
              <Text style={styles.completedSubtitle}>
                You have already completed your shift for today. Next check-in will open tomorrow (IST).
              </Text>
            </View>
          )}

          {/* When NOT Checked In and NOT completed: Show Check In Button */}
          {shiftStatus === 'CHECKED_OUT' && !alreadyCompletedToday && (
            <TouchableOpacity
              style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
              onPress={handleCheckIn}
              disabled={actionLoading}
            >
              <Text style={styles.primaryButtonText}>{actionLoading ? 'Checking…' : 'Check in'}</Text>
            </TouchableOpacity>
          )}

          {/* When Checked In: Show Break & Check Out buttons (NO Check In button) */}
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

          {/* When On Break: Show Resume Button */}
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

          {/* App Version & Manual Update Card */}
          <View style={styles.appVersionCard}>
            <View style={styles.appVersionInfo}>
              <Text style={styles.appVersionTitle}>Perzent Workforce</Text>
              <Text style={styles.appVersionSubtitle}>Version 1.1.2 (Build #4)</Text>
            </View>
            <TouchableOpacity
              style={styles.checkUpdateButton}
              onPress={() => AutoUpdateService.manualCheck()}
            >
              <Text style={styles.checkUpdateButtonText}>Check for Updates</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* --- TAB 2: MANAGER TEAM TRACKING & ADD EMPLOYEE --- */}
      {isManager && activeTab === 'TEAM' && (
        <View style={styles.teamContainer}>
          {/* Header Action: Add Employee */}
          <TouchableOpacity
            style={styles.addEmployeeTopButton}
            onPress={() => setAddEmployeeModalVisible(true)}
          >
            <Text style={styles.addEmployeeTopButtonText}>+ Add New Team Employee</Text>
          </TouchableOpacity>

          {/* Team Quick Stats */}
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

          {/* Employee Cards List */}
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

                  {/* Location & Ping Details */}
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

                  {/* Reset Device Binding Button */}
                  <TouchableOpacity
                    style={styles.resetBindingButton}
                    onPress={() => handleResetDevice(member.user_id, member.full_name)}
                  >
                    <Text style={styles.resetBindingText}>Reset Phone Binding</Text>
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
        onRequestClose={() => setAddEmployeeModalVisible(false)}
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
              placeholder="App Login Password"
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
                <Text style={styles.modalSubmitText}>{addingEmployee ? 'Creating…' : 'Create Employee'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Persistent Mandatory 'Allow all the time' Permission Modal */}
      {readiness?.blockers.some((item) => item.code === 'LOCATION_PERMISSION') && (
        <View style={styles.permissionModalBackdrop}>
          <View style={styles.permissionModalCard}>
            <View style={styles.permIconCircle}>
              <Text style={styles.permIcon}>📍</Text>
            </View>
            <Text style={styles.permTitle}>"Allow all the time" Required</Text>
            <Text style={styles.permDescription}>
              To accurately record your on-duty shift and GPS route, Perzent requires background location permission.
            </Text>
            <View style={styles.permStepBox}>
              <Text style={styles.permStepText}>1. Tap the button below to open Permission settings.</Text>
              <Text style={styles.permStepText}>2. Select <Text style={{ fontWeight: '800', color: '#166534' }}>"Allow all the time"</Text>.</Text>
            </View>
            <TouchableOpacity
              style={styles.permActionButton}
              onPress={() => DeviceIntegrityService.requestAlwaysPermission()}
            >
              <Text style={styles.permActionText}>Grant "Allow all the time"</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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

  // Permission Modal
  permissionModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  permissionModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
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
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  permDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  permStepBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  permStepText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 4,
  },
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
  },
  checkUpdateButtonText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '800',
  },
});
