import { NativeModules, Platform } from 'react-native';
import { API_CONFIG } from '../config/api';

export type TrackingState = {
  tracking_active: boolean;
  /** Native service received a 401: the session is dead, log the user out. */
  auth_invalid: boolean;
  /** Native service received 409 NO_ACTIVE_SHIFT: the shift was ended elsewhere. */
  shift_ended_remotely: boolean;
  /** Location permission was revoked while on duty; the service stopped itself. */
  permission_revoked: boolean;
  /** Epoch ms of the last GPS fix seen by the native service (0 if none). */
  last_fix_epoch: number;
};

export type DirectAccessConfig = { url: string; anon_key: string; token: string } | null | undefined;

const nativeModule = NativeModules.PerzentBackgroundTracking as
  | {
      startTracking: (
        token: string,
        userId: string,
        apiBaseUrl: string,
        punchInEpochMs: number,
        directUrl: string,
        directAnonKey: string,
        directToken: string
      ) => Promise<boolean>;
      stopTracking: () => Promise<boolean>;
      isTrackingActive: () => Promise<boolean>;
      getTrackingState: () => Promise<Partial<TrackingState>>;
      clearFlags: () => Promise<boolean>;
    }
  | undefined;

const EMPTY_STATE: TrackingState = {
  tracking_active: false,
  auth_invalid: false,
  shift_ended_remotely: false,
  permission_revoked: false,
  last_fix_epoch: 0,
};

export class BackgroundTrackingService {
  /**
   * Starts the native Android foreground location service. The service owns the single
   * persistent "on duty" notification and computes the shift timer from `punchInEpochMs`.
   */
  static async start(token?: string, userId?: string, punchInEpochMs?: number, direct?: DirectAccessConfig): Promise<void> {
    if (Platform.OS !== 'android' || !nativeModule) return;
    try {
      await nativeModule.startTracking(
        token || '',
        userId || '',
        API_CONFIG.BASE_URL || 'https://perzent.vercel.app',
        Number.isFinite(punchInEpochMs) ? (punchInEpochMs as number) : Date.now(),
        direct?.url || '',
        direct?.anon_key || '',
        direct?.token || ''
      );
    } catch (err) {
      console.warn('[BackgroundTrackingService] Failed to start native tracking service:', err);
    }
  }

  /**
   * Stops the native foreground service and removes its notification. Never throws.
   */
  static async stop(): Promise<void> {
    if (Platform.OS !== 'android' || !nativeModule) return;
    try {
      await nativeModule.stopTracking();
    } catch (err) {
      console.warn('[BackgroundTrackingService] Failed to stop native tracking service:', err);
    }
  }

  static async isRunning(): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) return false;
    try {
      return await nativeModule.isTrackingActive();
    } catch {
      return false;
    }
  }

  static async getState(): Promise<TrackingState> {
    if (Platform.OS !== 'android' || !nativeModule) return EMPTY_STATE;
    try {
      const raw = await nativeModule.getTrackingState();
      return {
        tracking_active: Boolean(raw?.tracking_active),
        auth_invalid: Boolean(raw?.auth_invalid),
        shift_ended_remotely: Boolean(raw?.shift_ended_remotely),
        permission_revoked: Boolean(raw?.permission_revoked),
        last_fix_epoch: Number(raw?.last_fix_epoch) || 0,
      };
    } catch {
      return EMPTY_STATE;
    }
  }

  static async clearFlags(): Promise<void> {
    if (Platform.OS !== 'android' || !nativeModule) return;
    try {
      await nativeModule.clearFlags();
    } catch {
      // ignore
    }
  }
}
