import * as Location from 'expo-location';
import { API_CONFIG } from '../config/api';

export class EmployeeApi {
  static async logout(session: any) {
    await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH_LOGIN}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.token}` },
    });
  }

  static async login(phone: string, password: string, device: any) {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH_LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_or_email: phone, password, ...device }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to sign in');
    return result;
  }

  static async attendance(session: any, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: any) {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MOBILE_ATTENDANCE}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Attendance request failed');
    return result;
  }

  static async currentPosition() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') throw new Error('Location permission is required');
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) throw new Error('Turn on Location Services (GPS) to continue');
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    if ((position.coords as typeof position.coords & { mocked?: boolean }).mocked) {
      throw new Error('Mock or fake location is not allowed');
    }
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  }
}
