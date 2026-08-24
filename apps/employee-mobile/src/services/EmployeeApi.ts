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

    let position: any = null;
    try {
      position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('GPS Timeout')), 6000)),
      ]);
    } catch {
      position = await Location.getLastKnownPositionAsync().catch(() => null);
    }

    if (!position?.coords) {
      position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }).catch(() => null);
    }

    if (!position?.coords) {
      throw new Error('Unable to acquire GPS position. Ensure GPS is enabled with clear sky view.');
    }

    if ((position.coords as typeof position.coords & { mocked?: boolean }).mocked) {
      throw new Error('Mock or fake location is not allowed');
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy || 10,
      speed: position.coords.speed || 0,
      heading: position.coords.heading || 0,
    };
  }

  static async sendWaypoint(session: any, position: { latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number }) {
    if (!session?.token) return null;
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WAYPOINTS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy || 10,
        speed: position.speed || 0,
        heading: position.heading || 0,
      }),
    });
    return response.json();
  }

  // Manager-specific API methods
  static async getManagerTeam(session: any) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/live-team`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load team members');
    return result;
  }

  static async addEmployee(session: any, data: { full_name: string; phone: string; password: string; designation?: string }) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        full_name: data.full_name,
        phone: data.phone,
        password: data.password,
        designation: data.designation || 'Field Staff',
        role: 'EMPLOYEE',
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to add employee');
    return result;
  }

  static async resetDeviceBinding(session: any, employeeId: string) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/employees`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ action: 'RESET_DEVICE', id: employeeId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to reset device binding');
    return result;
  }
}
