import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { LocationTrackingService } from '../services/LocationTrackingService';
import { DeviceTelemetryService } from '../services/DeviceTelemetryService';
import { DeviceTelemetry, SoundMode } from '@perzent/shared-types';

export default function DutyDashboardScreen({ session, deviceInfo }: { session: any; deviceInfo: any }) {
  const [shiftStatus, setShiftStatus] = useState<'CHECKED_OUT' | 'CHECKED_IN' | 'ON_BREAK'>('CHECKED_IN');
  const [gpsHardwareOn, setGpsHardwareOn] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(14400);
  const [breakTimerSec, setBreakTimerSec] = useState(1800);
  const [currentAddress, setCurrentAddress] = useState('Sector 62, Head Office Hub, Noida');
  const [telemetry, setTelemetry] = useState<DeviceTelemetry>(DeviceTelemetryService.getTelemetry());

  const [gpsErrorModal, setGpsErrorModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'DUTY' | 'TELEMETRY'>('DUTY');

  // Subscribe to live hardware telemetry
  useEffect(() => {
    const unsubscribe = DeviceTelemetryService.subscribe((liveData) => {
      setTelemetry(liveData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval: any;
    if (shiftStatus === 'CHECKED_IN') {
      interval = setInterval(() => setElapsedSec((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [shiftStatus]);

  useEffect(() => {
    let interval: any;
    if (shiftStatus === 'ON_BREAK') {
      interval = setInterval(() => {
        setBreakTimerSec((prev) => {
          if (prev <= 1) {
            setShiftStatus('CHECKED_IN');
            Alert.alert(
              'Lunch Break Ended',
              'Your 30-minute lunch break has concluded. Background tracking has automatically resumed.'
            );
            return 1800;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [shiftStatus]);

  const handleCheckIn = () => {
    if (!gpsHardwareOn) {
      setGpsErrorModal(true);
      return;
    }

    setShiftStatus('CHECKED_IN');
    LocationTrackingService.startTracking();
    Alert.alert('Shift Started', 'Attendance punched in. 2-minute background tracking is now active.');
  };

  const handleCheckOut = () => {
    if (!gpsHardwareOn) {
      Alert.alert('GPS Required', 'Please enable Location Services (GPS) to verify your checkout location.');
      return;
    }

    Alert.alert(
      'Confirm Check-Out',
      'Are you sure you want to end your shift? Background location tracking will stop immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Punch Out',
          style: 'destructive',
          onPress: () => {
            setShiftStatus('CHECKED_OUT');
            LocationTrackingService.stopTracking();
          },
        },
      ]
    );
  };

  const handleStartBreak = () => {
    Alert.alert(
      'Take Lunch / Break',
      'Location tracking will be PAUSED for privacy during your break (max 30 mins).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Break',
          onPress: () => {
            setShiftStatus('ON_BREAK');
            setBreakTimerSec(1800);
            LocationTrackingService.pauseTracking();
          },
        },
      ]
    );
  };

  const handleResumeShift = () => {
    if (!gpsHardwareOn) {
      setGpsErrorModal(true);
      return;
    }
    setShiftStatus('CHECKED_IN');
    LocationTrackingService.resumeTracking();
  };

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Header HUD with Primary Logo (White on Green) */}
      <View style={styles.topHud}>
        <View style={styles.brandRow}>
          <View style={styles.primaryLogoBadge}>
            <Text style={styles.primaryLogoText}>P</Text>
          </View>
          <View>
            <Text style={styles.welcomeText}>Logged In</Text>
            <Text style={styles.userName}>{session.full_name}</Text>
            <Text style={styles.userRole}>{session.designation}</Text>
          </View>
        </View>

        <View style={styles.statusBadges}>
          <TouchableOpacity
            style={[styles.badge, gpsHardwareOn ? styles.badgeGpsOn : styles.badgeGpsOff]}
            onPress={() => setGpsHardwareOn(!gpsHardwareOn)}
          >
            <Text style={styles.badgeText}>{gpsHardwareOn ? '● GPS: ON' : '✕ GPS: OFF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.badge, styles.badgeBattery]}
            onPress={() => DeviceTelemetryService.toggleBatteryCharging()}
          >
            <Text style={styles.badgeText}>
              {telemetry.battery_status === 'CHARGING' ? '⚡' : '🔋'} {telemetry.battery_level}%
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode Switcher: Duty vs Live Telemetry Monitor */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'DUTY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('DUTY')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'DUTY' && styles.tabBtnTextActive]}>
            📍 Duty Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'TELEMETRY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('TELEMETRY')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'TELEMETRY' && styles.tabBtnTextActive]}>
            ⚡ Live Telemetry ({telemetry.battery_level}% • {telemetry.sound_mode})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'DUTY' ? (
        <>
          {/* Active Shift Card */}
          <View style={styles.card}>
            {shiftStatus === 'CHECKED_IN' && (
              <>
                <View style={styles.activeShiftHeader}>
                  <View style={styles.greenDot} />
                  <Text style={styles.activeShiftTitle}>ON ACTIVE DUTY</Text>
                </View>
                <Text style={styles.timerDisplay}>{formatTimer(elapsedSec)}</Text>
                <Text style={styles.locationTag}>📍 {currentAddress}</Text>

                <View style={styles.trackingPill}>
                  <Text style={styles.trackingPillText}>
                    🛰️ Precision 2-Min Smart GPS Active • Hardware Telemetry Synced
                  </Text>
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.breakBtn} onPress={handleStartBreak}>
                    <Text style={styles.breakBtnText}>☕ TAKE LUNCH BREAK</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckOut}>
                    <Text style={styles.checkoutBtnText}>CHECK OUT</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {shiftStatus === 'ON_BREAK' && (
              <View style={styles.breakContainer}>
                <Text style={styles.breakTitle}>☕ LUNCH BREAK ACTIVE</Text>
                <Text style={styles.breakSubtitle}>Location Tracking is PAUSED for privacy</Text>

                <Text style={styles.countdownTimer}>{formatCountdown(breakTimerSec)}</Text>
                <Text style={styles.autoResumeNotice}>
                  Auto-resumes shift tracking in {Math.ceil(breakTimerSec / 60)} minutes
                </Text>

                <TouchableOpacity style={styles.resumeBtn} onPress={handleResumeShift}>
                  <Text style={styles.resumeBtnText}>RESUME SHIFT NOW</Text>
                </TouchableOpacity>
              </View>
            )}

            {shiftStatus === 'CHECKED_OUT' && (
              <View style={styles.offDutyContainer}>
                <Text style={styles.offDutyTitle}>OFF DUTY</Text>
                <Text style={styles.offDutySubtitle}>Location tracking is completely disabled.</Text>

                <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn}>
                  <Text style={styles.checkInBtnText}>CHECK IN (START WORK)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Hardware Glance Pill */}
          <TouchableOpacity
            style={styles.telemetryGlanceCard}
            onPress={() => setActiveTab('TELEMETRY')}
          >
            <View style={styles.glanceHeader}>
              <Text style={styles.glanceTitle}>📱 DEVICE TELEMETRY STREAMING LIVE</Text>
              <Text style={styles.glanceLink}>Manage ➔</Text>
            </View>
            <View style={styles.glanceGrid}>
              <View style={styles.glanceItem}>
                <Text style={styles.glanceIcon}>🔊</Text>
                <Text style={styles.glanceVal}>{telemetry.sound_volume}%</Text>
                <Text style={styles.glanceSub}>{telemetry.sound_mode}</Text>
              </View>
              <View style={styles.glanceItem}>
                <Text style={styles.glanceIcon}>☀️</Text>
                <Text style={styles.glanceVal}>{telemetry.brightness_level}%</Text>
                <Text style={styles.glanceSub}>Brightness</Text>
              </View>
              <View style={styles.glanceItem}>
                <Text style={styles.glanceIcon}>💾</Text>
                <Text style={styles.glanceVal}>{telemetry.storage_free_pct}%</Text>
                <Text style={styles.glanceSub}>Storage Free</Text>
              </View>
              <View style={styles.glanceItem}>
                <Text style={styles.glanceIcon}>🧠</Text>
                <Text style={styles.glanceVal}>{telemetry.ram_usage_pct}%</Text>
                <Text style={styles.glanceSub}>RAM Used</Text>
              </View>
              <View style={styles.glanceItem}>
                <Text style={styles.glanceIcon}>🔋</Text>
                <Text style={styles.glanceVal}>{telemetry.battery_level}%</Text>
                <Text style={styles.glanceSub}>{telemetry.battery_status}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Automation Rules */}
          <View style={styles.infoCard}>
            <Text style={styles.infoHeading}>SYSTEM AUTOMATION POLICIES:</Text>
            <Text style={styles.infoItem}>🌙 11:40 PM IST: Nightly Auto-Checkout</Text>
            <Text style={styles.infoItem}>☕ 30-Min Lunch Break: Tracking Paused</Text>
            <Text style={styles.infoItem}>📍 Stationary Mode: Merged into Single Stop</Text>
            <Text style={styles.infoItem}>🔒 Single Device Bound: {deviceInfo?.device_uuid}</Text>
          </View>
        </>
      ) : (
        /* LIVE HARDWARE TELEMETRY TRACKER VIEW */
        <View style={styles.telemetrySection}>
          {/* Header Card */}
          <View style={styles.telemetryHeaderCard}>
            <View style={styles.telemetryHeaderRow}>
              <View>
                <Text style={styles.telemetryHeaderTitle}>Device Live Hardware Status</Text>
                <Text style={styles.telemetryHeaderSub}>
                  {deviceInfo?.device_model} • {deviceInfo?.os_version}
                </Text>
              </View>
              <View style={styles.livePulseBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.livePulseText}>LIVE</Text>
              </View>
            </View>
          </View>

          {/* 1. BATTERY LIVE STATUS */}
          <View style={styles.telemetryCard}>
            <View style={styles.metricHeader}>
              <View style={styles.metricIconWrapGreen}>
                <Text style={styles.metricIcon}>🔋</Text>
              </View>
              <View style={styles.metricTitleGroup}>
                <Text style={styles.metricTitle}>Battery Live Status</Text>
                <Text style={styles.metricSubtitle}>
                  {telemetry.battery_status === 'CHARGING' ? 'Charging via AC' : 'Discharging on Battery'} • {telemetry.battery_temperature}°C
                </Text>
              </View>
              <Text style={styles.metricPrimaryValue}>{telemetry.battery_level}%</Text>
            </View>

            {/* Battery Progress Bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${telemetry.battery_level}%`,
                    backgroundColor:
                      telemetry.battery_level > 30 ? '#16A34A' : telemetry.battery_level > 15 ? '#F59E0B' : '#EF4444',
                  },
                ]}
              />
            </View>

            <View style={styles.metricActionRow}>
              <TouchableOpacity
                style={[styles.smallBtn, telemetry.battery_status === 'CHARGING' && styles.smallBtnActive]}
                onPress={() => DeviceTelemetryService.toggleBatteryCharging()}
              >
                <Text style={styles.smallBtnText}>
                  {telemetry.battery_status === 'CHARGING' ? '⚡ Unplug Charger' : '🔌 Plug in Charger'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, telemetry.battery_power_save && styles.smallBtnActive]}
                onPress={() => DeviceTelemetryService.togglePowerSave()}
              >
                <Text style={styles.smallBtnText}>
                  {telemetry.battery_power_save ? '🌿 Power Save: ON' : '⚡ Power Save: OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. SOUND / VOLUME TRACKING */}
          <View style={styles.telemetryCard}>
            <View style={styles.metricHeader}>
              <View style={styles.metricIconWrapGreen}>
                <Text style={styles.metricIcon}>🔊</Text>
              </View>
              <View style={styles.metricTitleGroup}>
                <Text style={styles.metricTitle}>Device Sound & Ringer</Text>
                <Text style={styles.metricSubtitle}>
                  Current Mode: <Text style={styles.highlightText}>{telemetry.sound_mode}</Text>
                </Text>
              </View>
              <Text style={styles.metricPrimaryValue}>{telemetry.sound_volume}%</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${telemetry.sound_volume}%`, backgroundColor: '#16A34A' },
                ]}
              />
            </View>

            <View style={styles.soundModesRow}>
              {(['NORMAL', 'VIBRATE', 'SILENT'] as SoundMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modePill, telemetry.sound_mode === mode && styles.modePillActive]}
                  onPress={() => DeviceTelemetryService.setSoundMode(mode)}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      telemetry.sound_mode === mode && styles.modePillTextActive,
                    ]}
                  >
                    {mode === 'NORMAL' ? '🔔 Normal' : mode === 'VIBRATE' ? '📳 Vibrate' : '🔇 Silent'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 3. BRIGHTNESS TRACKING */}
          <View style={styles.telemetryCard}>
            <View style={styles.metricHeader}>
              <View style={styles.metricIconWrapGreen}>
                <Text style={styles.metricIcon}>☀️</Text>
              </View>
              <View style={styles.metricTitleGroup}>
                <Text style={styles.metricTitle}>Display Brightness</Text>
                <Text style={styles.metricSubtitle}>
                  {telemetry.brightness_auto ? 'Adaptive Brightness Active' : 'Manual Level'}
                </Text>
              </View>
              <Text style={styles.metricPrimaryValue}>{telemetry.brightness_level}%</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${telemetry.brightness_level}%`, backgroundColor: '#16A34A' },
                ]}
              />
            </View>

            <View style={styles.metricActionRow}>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() =>
                  DeviceTelemetryService.setBrightnessLevel(
                    telemetry.brightness_level <= 30 ? 80 : 30
                  )
                }
              >
                <Text style={styles.smallBtnText}>
                  {telemetry.brightness_level <= 30 ? '🔆 Set to 80%' : '🌙 Dim to 30%'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, telemetry.brightness_auto && styles.smallBtnActive]}
                onPress={() => DeviceTelemetryService.toggleAutoBrightness()}
              >
                <Text style={styles.smallBtnText}>
                  {telemetry.brightness_auto ? '✓ Auto Brightness' : 'Manual Mode'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. FLASH STORAGE TRACKING */}
          <View style={styles.telemetryCard}>
            <View style={styles.metricHeader}>
              <View style={styles.metricIconWrapGreen}>
                <Text style={styles.metricIcon}>💾</Text>
              </View>
              <View style={styles.metricTitleGroup}>
                <Text style={styles.metricTitle}>Device Internal Storage</Text>
                <Text style={styles.metricSubtitle}>
                  {telemetry.storage_used_gb} GB Used / {telemetry.storage_total_gb} GB Total
                </Text>
              </View>
              <Text style={styles.metricPrimaryValue}>{telemetry.storage_free_pct}% Free</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${100 - telemetry.storage_free_pct}%`,
                    backgroundColor: '#16A34A',
                  },
                ]}
              />
            </View>

            <View style={styles.storageDetailsRow}>
              <Text style={styles.storageDetailText}>
                Free Space: <Text style={styles.whiteBold}>{telemetry.storage_free_gb} GB</Text>
              </Text>
              <Text style={styles.storageDetailText}>
                Status: <Text style={styles.greenBold}>Healthy</Text>
              </Text>
            </View>
          </View>

          {/* 5. R.A.M MEMORY TRACKING */}
          <View style={styles.telemetryCard}>
            <View style={styles.metricHeader}>
              <View style={styles.metricIconWrapGreen}>
                <Text style={styles.metricIcon}>🧠</Text>
              </View>
              <View style={styles.metricTitleGroup}>
                <Text style={styles.metricTitle}>R.A.M Memory Usage</Text>
                <Text style={styles.metricSubtitle}>
                  {telemetry.ram_used_gb} GB Used / {telemetry.ram_total_gb} GB Allocated
                </Text>
              </View>
              <Text style={styles.metricPrimaryValue}>{telemetry.ram_usage_pct}%</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${telemetry.ram_usage_pct}%`, backgroundColor: '#16A34A' },
                ]}
              />
            </View>

            <View style={styles.metricActionRow}>
              <TouchableOpacity
                style={[styles.smallBtn, styles.smallBtnPrimaryGreen]}
                onPress={() => {
                  DeviceTelemetryService.optimizeRam();
                  Alert.alert('Memory Optimized', 'Background task caches flushed. RAM usage lowered.');
                }}
              >
                <Text style={styles.smallBtnTextWhite}>⚡ Flush & Optimize RAM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* GPS Error Modal */}
      <Modal visible={gpsErrorModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⚠️ GPS LOCATION SERVICES REQUIRED</Text>
            <Text style={styles.modalBody}>
              Location Services (GPS) must be active to record verified attendance. Please enable Location in your device settings.
            </Text>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setGpsHardwareOn(true);
                setGpsErrorModal(false);
              }}
            >
              <Text style={styles.modalBtnText}>ENABLE LOCATION & PROCEED</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 18,
    backgroundColor: '#0F172A',
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryLogoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#16A34A', // Brand Primary Green
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryLogoText: {
    color: '#FFFFFF', // Text on green buttons / logo
    fontSize: 22,
    fontWeight: '900',
  },
  welcomeText: {
    color: '#6B7280', // Secondary Text
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#22C55E',
    fontSize: 11,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeGpsOn: {
    backgroundColor: '#14532D',
    borderColor: '#16A34A',
  },
  badgeGpsOff: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  badgeBattery: {
    backgroundColor: '#1E293B',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#16A34A', // Brand Primary Green
    shadowColor: '#16A34A',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },
  activeShiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  activeShiftTitle: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerDisplay: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginVertical: 10,
  },
  locationTag: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 14,
  },
  trackingPill: {
    backgroundColor: '#14532D40',
    borderColor: '#16A34A40',
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginBottom: 18,
  },
  trackingPillText: {
    color: '#4ADE80',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  breakBtn: {
    flex: 1,
    backgroundColor: '#D97706',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  breakBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  breakContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  breakTitle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  breakSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  countdownTimer: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginVertical: 14,
  },
  autoResumeNotice: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 18,
  },
  resumeBtn: {
    backgroundColor: '#16A34A', // Brand Green
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  offDutyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  offDutyTitle: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: 'bold',
  },
  offDutySubtitle: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  checkInBtn: {
    backgroundColor: '#16A34A', // Brand Primary Green
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  telemetryGlanceCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  glanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  glanceTitle: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  glanceLink: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
  },
  glanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  glanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  glanceIcon: {
    fontSize: 14,
  },
  glanceVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  glanceSub: {
    color: '#6B7280',
    fontSize: 9,
    marginTop: 1,
  },
  infoCard: {
    backgroundColor: '#1E293B60',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  infoHeading: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  infoItem: {
    color: '#94A3B8',
    fontSize: 11,
    marginVertical: 2,
  },
  // Telemetry Tab Styles
  telemetrySection: {
    gap: 12,
  },
  telemetryHeaderCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  telemetryHeaderSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#14532D',
    borderColor: '#16A34A',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  livePulseText: {
    color: '#4ADE80',
    fontSize: 9,
    fontWeight: '800',
  },
  telemetryCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricIconWrapGreen: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#14532D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  metricIcon: {
    fontSize: 16,
  },
  metricTitleGroup: {
    flex: 1,
  },
  metricTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  metricSubtitle: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 1,
  },
  metricPrimaryValue: {
    color: '#16A34A',
    fontSize: 16,
    fontWeight: '900',
  },
  highlightText: {
    color: '#4ADE80',
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  smallBtnActive: {
    backgroundColor: '#15803D',
    borderColor: '#16A34A',
    borderWidth: 1,
  },
  smallBtnPrimaryGreen: {
    backgroundColor: '#16A34A',
  },
  smallBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  smallBtnTextWhite: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  soundModesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modePill: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  modePillText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  modePillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  storageDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageDetailText: {
    color: '#6B7280',
    fontSize: 10,
  },
  whiteBold: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  greenBold: {
    color: '#4ADE80',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#1E293B',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalBody: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
  },
  modalBtn: {
    backgroundColor: '#16A34A', // Brand Primary Green
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
