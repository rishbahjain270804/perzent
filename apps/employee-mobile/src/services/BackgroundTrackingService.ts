import { NativeModules, Platform } from 'react-native';
import { API_CONFIG } from '../config/api';

const nativeModule = NativeModules.PerzentBackgroundTracking as
  | {
      startTracking: (token: string, userId: string, apiBaseUrl: string) => Promise<boolean>;
      stopTracking: () => Promise<boolean>;
      isTrackingActive: () => Promise<boolean>;
    }
  | undefined;

export class BackgroundTrackingService {
  /**
   * Starts the native Android sticky foreground service.
   * This service runs 24/7 in background and survives app swipe/removal from recent menu.
   */
  static async start(token?: string, userId?: string): Promise<void> {
    if (Platform.OS !== 'android' || !nativeModule) return;
    try {
      const safeToken = token || '';
      const safeUserId = userId || '';
      const safeBaseUrl = API_CONFIG?.BASE_URL || 'https://perzent.vercel.app';
      await nativeModule.startTracking(safeToken, safeUserId, safeBaseUrl);
    } catch (err) {
      console.warn('[BackgroundTrackingService] Failed to start native tracking service:', err);
    }
  }

  /**
   * Stops the native Android foreground service and removes notification.
   */
  static async stop(): Promise<void> {
    if (Platform.OS !== 'android' || !nativeModule) return;
    try {
      await nativeModule.stopTracking();
    } catch (err) {
      console.warn('[BackgroundTrackingService] Failed to stop native tracking service:', err);
    }
  }

  /**
   * Checks if the native background service is currently active.
   */
  static async isRunning(): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) return false;
    try {
      return await nativeModule.isTrackingActive();
    } catch {
      return false;
    }
  }
}
