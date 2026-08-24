import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DeviceBindingService } from '../services/DeviceBindingService';
import { EmployeeApi } from '../services/EmployeeApi';
import { AutoUpdateService } from '../services/AutoUpdateService';

export default function LoginScreen({
  onLoginSuccess,
  deviceInfo,
}: {
  onLoginSuccess: (user: any) => void;
  deviceInfo: any;
}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      Alert.alert('Missing details', 'Enter your registered phone number and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await EmployeeApi.login(phone.trim(), password, deviceInfo);
      await DeviceBindingService.saveSession(user);
      onLoginSuccess(user);
    } catch (error: any) {
      Alert.alert('Login failed', error.message || 'Unable to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>P</Text>
        </View>
        <Text style={styles.title}>Welcome to Perzent</Text>
        <Text style={styles.subtitle}>Sign in to start or manage your work shift.</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Registered phone number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            autoComplete="tel"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Work device protection</Text>
          <Text style={styles.noticeText}>
            Device integrity and work-session signals are checked securely. Technical details are visible only to authorized management.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => AutoUpdateService.manualCheck()}
        >
          <Text style={styles.updateButtonText}>🔄 Check for App Updates • v3.0.0 (Build #3)</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Accounts are created by your employer.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    alignSelf: 'center',
    marginBottom: 18,
  },
  brandLetter: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  title: { color: '#0F172A', fontSize: 27, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#64748B', fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 28 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: { color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 4 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  loginButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  notice: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 15,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  noticeTitle: { color: '#166534', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  noticeText: { color: '#3F6212', fontSize: 13, lineHeight: 19 },
  updateButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  updateButtonText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '800',
  },
  footer: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
