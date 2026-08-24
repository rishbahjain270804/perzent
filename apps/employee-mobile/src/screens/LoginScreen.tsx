import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { DeviceBindingService } from '../services/DeviceBindingService';
import { DeviceTelemetryService } from '../services/DeviceTelemetryService';

export default function LoginScreen({
  onLoginSuccess,
  deviceInfo,
}: {
  onLoginSuccess: (user: any) => void;
  deviceInfo: any;
}) {
  const [phone, setPhone] = useState('+919811122233');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [telemetry] = useState(DeviceTelemetryService.getTelemetry());

  const handleLogin = async () => {
    setLoading(true);

    try {
      const user = {
        user_id: 'user-amit-employee',
        company_id: 'comp-acme-1001',
        full_name: 'Amit Kumar',
        designation: 'Senior Field Sales Executive',
        department_name: 'North Delhi Sales Hub',
        phone: phone,
        role: 'EMPLOYEE',
      };

      DeviceBindingService.saveSession(user);
      onLoginSuccess(user);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Unable to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoPhone: string) => {
    setPhone(demoPhone);
    setPassword('password123');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Primary & Secondary Logo Showcase Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          {/* Primary Logo: White on Green */}
          <View style={styles.primaryLogoBadge}>
            <Text style={styles.primaryLogoText}>P</Text>
          </View>

          {/* Secondary Logo: Black/Dark on White */}
          <View style={styles.secondaryLogoBadge}>
            <Text style={styles.secondaryLogoText}>P</Text>
          </View>
        </View>

        <Text style={styles.appTitle}>PERZENT</Text>
        <Text style={styles.appSubtitle}>Field Employee Duty & Real-Time Tracking</Text>
      </View>

      {/* Hardware Telemetry Pre-Check Card */}
      <View style={styles.deviceCard}>
        <View style={styles.deviceTitleRow}>
          <Text style={styles.deviceTitle}>BOUND PHYSICAL DEVICE:</Text>
          <View style={styles.deviceVerifiedPill}>
            <Text style={styles.deviceVerifiedText}>VERIFIED HARDWARE</Text>
          </View>
        </View>
        <Text style={styles.deviceUuid}>
          {deviceInfo?.device_model} • {deviceInfo?.device_uuid}
        </Text>

        <View style={styles.telemetryQuickRow}>
          <View style={styles.telemetryChip}>
            <Text style={styles.telemetryChipIcon}>🔋</Text>
            <Text style={styles.telemetryChipVal}>{telemetry.battery_level}%</Text>
          </View>
          <View style={styles.telemetryChip}>
            <Text style={styles.telemetryChipIcon}>🔊</Text>
            <Text style={styles.telemetryChipVal}>{telemetry.sound_mode}</Text>
          </View>
          <View style={styles.telemetryChip}>
            <Text style={styles.telemetryChipIcon}>☀️</Text>
            <Text style={styles.telemetryChipVal}>{telemetry.brightness_level}%</Text>
          </View>
          <View style={styles.telemetryChip}>
            <Text style={styles.telemetryChipIcon}>💾</Text>
            <Text style={styles.telemetryChipVal}>{telemetry.storage_free_pct}% Free</Text>
          </View>
          <View style={styles.telemetryChip}>
            <Text style={styles.telemetryChipIcon}>🧠</Text>
            <Text style={styles.telemetryChipVal}>{telemetry.ram_used_gb} GB RAM</Text>
          </View>
        </View>

        <Text style={styles.deviceNotice}>
          Single-device hardware anti-tamper lock active. Live battery, sound, storage & RAM status synchronized upon shift check-in.
        </Text>
      </View>

      {/* Login Form */}
      <View style={styles.form}>
        <Text style={styles.label}>REGISTERED PHONE NUMBER</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98111 22233"
          placeholderTextColor="#6B7280"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>PASSWORD / ACCESS PIN</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          placeholderTextColor="#6B7280"
          secureTextEntry
        />

        {/* Primary Green Button (#16A34A) with #FFFFFF text */}
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginBtnText}>{loading ? 'VERIFYING HARDWARE...' : 'LOGIN TO SHIFT'}</Text>
        </TouchableOpacity>

        <View style={styles.noRegisterNotice}>
          <Text style={styles.noRegisterText}>
            🔒 Zero Self-Registration Policy. Accounts are provisioned exclusively by employer management.
          </Text>
        </View>

        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>QUICK DEMO FIELD REPS:</Text>
          <View style={styles.demoRow}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => fillDemo('+919811122233')}
            >
              <Text style={styles.demoBtnText}>Amit Kumar (Sales)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => fillDemo('+919811122244')}
            >
              <Text style={styles.demoBtnText}>Sneha Patel (Client)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 22,
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  // Primary Logo: White on Green (#16A34A)
  primaryLogoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryLogoText: {
    color: '#FFFFFF', // Text on green
    fontSize: 26,
    fontWeight: '900',
  },
  // Secondary Logo: Black/Dark (#111827) on White (#FFFFFF)
  secondaryLogoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryLogoText: {
    color: '#111827', // Almost black primary text
    fontSize: 26,
    fontWeight: '900',
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  appSubtitle: {
    color: '#6B7280', // Secondary Text
    fontSize: 12,
    marginTop: 4,
  },
  deviceCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceTitle: {
    color: '#16A34A', // Brand Primary Green
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deviceVerifiedPill: {
    backgroundColor: '#14532D',
    borderColor: '#16A34A',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deviceVerifiedText: {
    color: '#4ADE80',
    fontSize: 8,
    fontWeight: 'bold',
  },
  deviceUuid: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  telemetryQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
  },
  telemetryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  telemetryChipIcon: {
    fontSize: 10,
  },
  telemetryChipVal: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
  },
  deviceNotice: {
    color: '#6B7280', // Secondary Text
    fontSize: 10,
    lineHeight: 14,
  },
  form: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  label: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 13,
  },
  // Primary Green Button: #16A34A, Hover: #15803D
  loginBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  loginBtnText: {
    color: '#FFFFFF', // Text on green buttons: #FFFFFF
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  noRegisterNotice: {
    marginTop: 14,
    padding: 10,
    backgroundColor: '#0F172A80',
    borderRadius: 10,
  },
  noRegisterText: {
    color: '#6B7280', // Secondary Text
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  demoSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopColor: '#334155',
    borderTopWidth: 1,
  },
  demoTitle: {
    color: '#6B7280', // Secondary Text
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoBtnText: {
    color: '#86EFAC',
    fontSize: 11,
    fontWeight: '600',
  },
});
