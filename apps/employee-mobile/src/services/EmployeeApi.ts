import * as Location from 'expo-location';
import { API_CONFIG } from '../config/api';
import { SessionEvents } from './SessionEvents';
import { DirectAccess } from './DirectAccess';

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

/** Give up on a single attempt after this long; the field network can stall silently. */
const REQUEST_TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 1_500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * JSON request with a timeout and ONE automatic retry on network failure / 5xx.
 * Retrying attendance actions is safe: the server rejects duplicates with 409 codes
 * (SHIFT_ACTIVE / BREAK_ACTIVE / NO_ACTIVE_BREAK) which the screen treats as "re-sync".
 */
async function request(
  session: SessionLike,
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body: unknown,
  fallback: string,
  attempt = 0
): Promise<any> {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let response: Response;
  let data: any = null;
  try {
    response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}${path}`, init);
    data = await parseBody(response);
  } catch (error: any) {
    if (attempt === 0) {
      await wait(RETRY_DELAY_MS);
      return request(session, path, method, body, fallback, attempt + 1);
    }
    const timedOut = error?.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? 'The server took too long to respond. Check your connection and try again.'
        : 'Network unavailable. Check your internet connection and try again.',
      0
    );
  }

  if (response.ok) return data;
  if (response.status >= 500 && attempt === 0) {
    await wait(RETRY_DELAY_MS);
    return request(session, path, method, body, fallback, attempt + 1);
  }

  const message = describeHttpFailure(response.status, data, fallback);
  if (response.status === 401) {
    // Any authenticated call that returns 401 means the session is dead: kick back to Login.
    SessionEvents.emitUnauthorized();
  }
  if (response.status === 503 && data?.code === 'MAINTENANCE') {
    SessionEvents.emitMaintenance(data);
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
    if (response.status === 503 && result?.code === 'MAINTENANCE') SessionEvents.emitMaintenance(result);
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

  /** Shift state for the duty screen — database-direct when available, API otherwise. */
  static async shiftState(session: any) {
    const direct = await DirectAccess.rpc(session, 'my_shift_state', {});
    if (direct?.ok && direct.data) return direct.data;
    if (direct && !direct.ok && (direct.status === 401 || direct.status === 403)) {
      throw new ApiError('Session expired, please sign in again', 401);
    }
    return this.attendance(session);
  }

  /** The employee's own recent shifts (newest first) with weekly totals. */
  static async shiftHistory(session: any, days = 7) {
    return request(session, `${API_CONFIG.ENDPOINTS.ATTENDANCE_HISTORY}?days=${days}`, 'GET', undefined, 'Could not load your shift history');
  }

  /** Device telemetry / presence heartbeat — database-direct when available, API otherwise. */
  static async telemetry(session: any, telemetry: unknown, device?: unknown) {
    const direct = await DirectAccess.rpc(session, 'device_heartbeat', { p_telemetry: telemetry ?? {}, p_device: device ?? {} });
    if (direct?.ok) return direct.data;
    return this.attendance(session, 'PATCH', { telemetry, device });
  }

  /**
   * Best-effort position for an EMERGENCY SOS: unlike currentPosition() this never refuses to
   * return. It tries a quick fresh fix, then last-known, then a coarse fix, and only if the phone
   * has never had any location does it throw — an SOS must go through even with GPS struggling or
   * services just toggled off (last-known still resolves). Mock locations are still rejected.
   */
  static async sosPosition(): Promise<DevicePosition> {
    const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (permission && !permission.granted) throw new Error('Location permission is required to send an SOS');

    let position: Location.LocationObject | null = null;
    try {
      position = await Promise.race<Location.LocationObject>([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('GPS Timeout')), 5000)),
      ]);
    } catch {
      position = await Location.getLastKnownPositionAsync().catch(() => null);
    }
    if (!position?.coords) {
      position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }).catch(() => null);
    }
    if (!position?.coords) {
      position = await Location.getLastKnownPositionAsync({ maxAge: 600000 }).catch(() => null);
    }
    if (!position?.coords) {
      throw new Error('Could not get your location. Move to open sky and try again, or call for help directly.');
    }
    if (position.mocked) throw new Error('Mock or fake location is not allowed');
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? 50,
      speed: position.coords.speed ?? 0,
      heading: position.coords.heading ?? 0,
    };
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

  // Leave Management methods
  static getLeaves(session: any) {
    return request(session, '/api/leave?mine=1', 'GET', undefined, 'Could not load leave requests');
  }

  static requestLeave(session: any, data: { leave_type: 'PAID' | 'SICK' | 'CASUAL' | 'UNPAID'; start_date: string; end_date: string; reason: string }) {
    return request(session, '/api/leave', 'POST', data, 'Could not submit leave request');
  }

  // SOS Emergency Dispatch methods
  static triggerSos(session: any, location: DevicePosition, note?: string) {
    return request(
      session,
      '/api/sos',
      'POST',
      {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        note: note || 'EMERGENCY SOS ALERT',
      },
      'Could not send emergency SOS alert'
    );
  }

  static getActiveSos(session: any) {
    return request(session, '/api/sos', 'GET', undefined, 'Could not load active SOS alert');
  }
}
