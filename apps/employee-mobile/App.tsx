import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import DutyDashboardScreen from './src/screens/DutyDashboardScreen';
import { DeviceBindingService } from './src/services/DeviceBindingService';
import { EmployeeApi } from './src/services/EmployeeApi';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const info = await DeviceBindingService.getDeviceFingerprint();
      setDeviceInfo(info);
      const saved = await DeviceBindingService.getSavedSession();
      if (saved) setSession(saved);
      setLoading(false);
    })();
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
            await EmployeeApi.logout(session).catch(() => undefined);
            await DeviceBindingService.clearSession();
            setSession(null);
          }}
        />
      ) : (
        <LoginScreen onLoginSuccess={(user) => setSession(user)} deviceInfo={deviceInfo} />
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
});
