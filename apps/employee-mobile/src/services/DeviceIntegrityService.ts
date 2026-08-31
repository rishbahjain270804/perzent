import { Linking, NativeModules, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { RemoteConfigService } from './RemoteConfigService';
import type { DeviceTelemetry } from '@perzent/shared-types';

type NativeIntegrity = {
  batteryLevel: number;
  batteryCharging: boolean;
  batteryStatus?: 'CHARGING' | 'DISCHARGING' | 'FULL';
  powerSaveMode: boolean;
  developerOptionsEnabled: boolean;
};

/** Telemetry sent by the mobile app; extends the shared type with the background-location flag. */
export type MobileTelemetry = DeviceTelemetry & {
  background_location_permission_granted: boolean;
};

export type ComplianceBlocker = {
  code:
    | 'LOCATION_PERMISSION'
    | 'LOCATION_SERVICES'
    | 'DEVELOPER_OPTIONS'
    | 'POWER_SAVER'
    | 'LOW_BATTERY'
    | 'MOCK_LOCATION'
    | 'LOCATION_UNAVAILABLE'
    | 'WEAK_GPS';
  message: string;
};

export type WorkReadiness = {
  ready: boolean;
  blockers: ComplianceBlocker[];
  position?: { latitude: number; longitude: number; accuracy: number | null };
  telemetry: MobileTelemetry;
};

export type LocationPermissionState = {
  foreground: boolean;
  background: boolean;
  /** Android 10+ needs "Allow all the time" for the on-duty foreground service to keep receiving fixes. */
  backgroundRequired: boolean;
  /** True when everything this platform needs has been granted. */
  complete: boolean;
  canAskAgain: boolean;
};

const nativeIntegrity = NativeModules.DeviceIntegrity as
  | { getStatus: () => Promise<NativeIntegrity> }
  | undefined;

const ANDROID_VERSION = Platform.OS === 'android' ? Number(Platform.Version) : 0;

export class DeviceIntegrityService {
  static readonly backgroundPermissionRequired = Platform.OS === 'android' && ANDROID_VERSION >= 29;

  static async getLocationPermissionState(): Promise<LocationPermissionState> {
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = fg.granted
      ? await Location.getBackgroundPermissionsAsync().catch(() => ({ granted: false, canAskAgain: true }))
      : { granted: false, canAskAgain: fg.canAskAgain };
    const backgroundRequired = this.backgroundPermissionRequired;
    return {
      foreground: fg.granted,
      background: bg.granted,
      backgroundRequired,
      complete: fg.granted && (!backgroundRequired || bg.granted),
      canAskAgain: fg.granted ? bg.canAskAgain !== false : fg.canAskAgain !== false,
    };
  }

  /**
   * Requests foreground and then background location.
   * Only call this AFTER the in-app prominent disclosure has been shown and accepted
   * (Google Play background-location policy).
   */
  static async requestLocationPermissions(): Promise<LocationPermissionState> {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.granted && this.backgroundPermissionRequired) {
      const bg = await Location.getBackgroundPermissionsAsync().catch(() => ({ granted: false }));
      if (!bg.granted) {
        await Location.requestBackgroundPermissionsAsync().catch(() => undefined);
      }
    }
    return this.getLocationPermissionState();
  }

  /** Android 13+ requires runtime POST_NOTIFICATIONS for the on-duty notification to be visible. */
  static async ensureNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || ANDROID_VERSION < 33) return true;
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      const requested = await Notifications.requestPermissionsAsync();
      return requested.granted;
    } catch {
      return false;
    }
  }

  static async inspect(options: { acquirePosition?: boolean } = {}): Promise<WorkReadiness> {
    const permission = await this.getLocationPermissionState();
    const locationServicesEnabled = await Location.hasServicesEnabledAsync().catch(() => false);

    if (Platform.OS === 'android' && !nativeIntegrity) {
      throw new Error('Device compliance service is unavailable. Reinstall the official Perzent app.');
    }

    const native: NativeIntegrity = nativeIntegrity
      ? await nativeIntegrity.getStatus()
      : {
          batteryLevel: 100,
          batteryCharging: false,
          powerSaveMode: false,
          developerOptionsEnabled: false,
        };

    const blockers: ComplianceBlocker[] = [];
    if (!permission.foreground) {
      blockers.push({
        code: 'LOCATION_PERMISSION',
        message: 'Location permission is required. Tap "Enable location sharing" below.',
      });
    } else if (permission.backgroundRequired && !permission.background) {
      blockers.push({
        code: 'LOCATION_PERMISSION',
        message: 'Set location permission to "Allow all the time" so tracking continues while the app is in the background.',
      });
    }
    if (!locationServicesEnabled) {
      blockers.push({ code: 'LOCATION_SERVICES', message: 'Turn on Location Services (GPS).' });
    }
    if (native.powerSaveMode) {
      blockers.push({ code: 'POWER_SAVER', message: 'Turn off Battery Saver / Power Saving mode.' });
    }
    if (native.batteryLevel < 5) {
      blockers.push({ code: 'LOW_BATTERY', message: 'Charge the phone to at least 5%.' });
    }

    let position: WorkReadiness['position'];
    let mockLocationDetected = false;
    if (options.acquirePosition && permission.foreground && locationServicesEnabled) {
      const gate = RemoteConfigService.config.location;
      try {
        // Indoors a high-accuracy fix can take minutes or never arrive; bound the wait so the button
        // never sits on "Verifying…" forever, and reject fixes too coarse to prove attendance.
        const current = await Promise.race<Location.LocationObject>([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise<Location.LocationObject>((_, reject) => setTimeout(() => reject(new Error('GPS_TIMEOUT')), gate.checkin_fix_timeout_ms)),
        ]);
        // expo-location 18: `mocked` is a property of the LocationObject, not of `coords`.
        mockLocationDetected = Boolean(current.mocked);
        if (mockLocationDetected) {
          blockers.push({ code: 'MOCK_LOCATION', message: 'Disable mock/fake location apps.' });
        } else if ((current.coords.accuracy ?? 0) > gate.checkin_max_accuracy_m) {
          blockers.push({
            code: 'WEAK_GPS',
            message: `Weak GPS signal (±${Math.round(current.coords.accuracy ?? 0)} m). Move near a window or outdoors; this re-checks automatically.`,
          });
        } else {
          position = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            accuracy: current.coords.accuracy,
          };
        }
      } catch (error) {
        const timedOut = error instanceof Error && error.message === 'GPS_TIMEOUT';
        blockers.push({
          code: 'LOCATION_UNAVAILABLE',
          message: timedOut
            ? `No GPS fix in ${Math.round(gate.checkin_fix_timeout_ms / 1000)} s. Move outdoors or near a window and try again.`
            : 'Move outdoors and wait for a verified GPS position.',
        });
      }
    }

    const batteryStatus: MobileTelemetry['battery_status'] =
      native.batteryStatus ?? (native.batteryCharging ? 'CHARGING' : 'DISCHARGING');

    const telemetry: MobileTelemetry = {
      battery_level: Math.max(0, Math.min(100, Math.round(native.batteryLevel))),
      battery_status: batteryStatus,
      battery_power_save: native.powerSaveMode,
      developer_options_enabled: native.developerOptionsEnabled,
      location_services_enabled: locationServicesEnabled,
      location_permission_granted: permission.foreground,
      background_location_permission_granted: permission.background,
      mock_location_detected: mockLocationDetected,
      updated_at: new Date().toISOString(),
    };

    return { ready: blockers.length === 0, blockers, position, telemetry };
  }

  static openAppSettings() {
    return Linking.openSettings();
  }
}
