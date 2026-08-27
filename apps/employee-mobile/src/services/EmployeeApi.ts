import * as Location from 'expo-location';
import { API_CONFIG } from '../config/api';
import { SessionEvents } from './SessionEvents';

export type AttendanceErrorCode =
  | 'NO_ACTIVE_SHIFT'
  | 'SHIFT_ACTIVE'
  | 'BREAK_ACTIVE'
  | 'NO_ACTIVE_BREAK'
  | 'COMPLIANCE'
  | 'VALIDATION';

export class ApiError extends Error {
  status: number;
  code?: AttendanceErrorCode | string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const isUnauthorizedError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401;

export type DevicePosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
};

type SessionLike = { token?: string } | null | undefined;

async function parseBody(response: Response): Promise<any | null> {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Human-readable message for a non-2xx response, tolerating non-JSON bodies. */
export function describeHttpFailure(status: number, body: any, fallback: string): string {
  if (body && typeof body.error === 'string' && body.error.trim()) return body.error;
  if (status === 401) return 'Session expired, please sign in again';
  if (!body || status >= 500) return `Server unavailable (HTTP ${status})`;
  return fallback;
}

async function request(
  session: SessionLike,
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body: unknown,
  fallback: string
): Promise<any> {
  let response: Response;
  try {
    response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError('Network unavailable. Check your internet connection and try again.', 0);
  }

  const data = await parseBody(response);
  if (response.ok) return data;

  const message = describeHttpFailure(response.status, data, fallback);
  if (response.status === 401) {
    // Any authenticated call that returns 401 means the session is dead: kick back to Login.
    SessionEvents.emitUnauthorized();
  }
  throw new ApiError(message, response.status, typeof data?.code === 'string' ? data.code : undefined);
}

export class EmployeeApi {
  static async logout(session: any) {
    await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH_LOGIN}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.token}` },
    });
  }

  /** Login is unauthenticated, so a 401 here is "wrong credentials", not "session expired". */
  static async login(phone: string, password: string, device: any) {
    let response: Response;
    try {
      response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH_LOGIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_or_email: phone, password, ...device }),
      });
    } catch {
      throw new ApiError('Network unavailable. Check your internet connection and try again.', 0);
    }
    const result = await parseBody(response);
    if (!response.ok) {
      const message =
        result && typeof result.error === 'string' && result.error.trim()
          ? result.error
          : !result || response.status >= 500
            ? `Server unavailable (HTTP ${response.status})`
            : 'Unable to sign in';
      throw new ApiError(message, response.status, result?.code);
    }
    return result;
  }

  static attendance(session: any, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: any) {
    return request(session, API_CONFIG.ENDPOINTS.MOBILE_ATTENDANCE, method, body, 'Attendance request failed');
  }

  static async currentPosition(): Promise<DevicePosition> {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) throw new Error('Location permission is required');
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) throw new Error('Turn on Location Services (GPS) to continue');

    let position: Location.LocationObject | null = null;
    try {
      position = await Promise.race<Location.LocationObject>([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('GPS Timeout')), 6000)),
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

    // expo-location 18 reports the mock flag on the LocationObject itself, not on coords.
    if (position.mocked) {
      throw new Error('Mock or fake location is not allowed');
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? 10,
      speed: position.coords.speed ?? 0,
      heading: position.coords.heading ?? 0,
    };
  }

  // Manager-specific API methods
  static getManagerTeam(session: any) {
    return request(session, API_CONFIG.ENDPOINTS.LIVE_TEAM, 'GET', undefined, 'Could not load team members');
  }

  static addEmployee(session: any, data: { full_name: string; phone: string; password: string; designation?: string }) {
    return request(
      session,
      API_CONFIG.ENDPOINTS.EMPLOYEES,
      'POST',
      {
        full_name: data.full_name,
        phone: data.phone,
        password: data.password,
        designation: data.designation || 'Field Staff',
        role: 'EMPLOYEE',
      },
      'Failed to add employee'
    );
  }

  static resetDeviceBinding(session: any, employeeId: string) {
    return request(
      session,
      API_CONFIG.ENDPOINTS.EMPLOYEES,
      'PATCH',
      { action: 'RESET_DEVICE', id: employeeId },
      'Failed to reset device binding'
    );
  }
}
