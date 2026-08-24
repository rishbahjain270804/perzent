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

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    const info = DeviceBindingService.getDeviceFingerprint();
    setDeviceInfo(info);

    const saved = DeviceBindingService.getSavedSession();
    if (saved) {
      setSession(saved);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Initializing Perzent Anti-Tamper Engine...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />
      {session ? (
        <DutyDashboardScreen session={session} deviceInfo={deviceInfo} />
      ) : (
        <LoginScreen onLoginSuccess={(user) => setSession(user)} deviceInfo={deviceInfo} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
  },
});
