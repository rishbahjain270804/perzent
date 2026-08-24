import { Linking, NativeModules, Platform } from 'react-native';
import * as Location from 'expo-location';
import type { DeviceTelemetry } from '@perzent/shared-types';

type NativeIntegrity = {
  batteryLevel: number;
  batteryCharging: boolean;
  powerSaveMode: boolean;
  developerOptionsEnabled: boolean;
};

export type ComplianceBlocker = {
  code: 'LOCATION_PERMISSION' | 'LOCATION_SERVICES' | 'DEVELOPER_OPTIONS' | 'POWER_SAVER' | 'LOW_BATTERY' | 'MOCK_LOCATION' | 'LOCATION_UNAVAILABLE';
  message: string;
};

export type WorkReadiness = {
  ready: boolean;
  blockers: ComplianceBlocker[];
  position?: { latitude: number; longitude: number; accuracy: number | null };
  telemetry: DeviceTelemetry;
};

const nativeIntegrity = NativeModules.DeviceIntegrity as
  | { getStatus: () => Promise<NativeIntegrity> }
  | undefined;

export class DeviceIntegrityService {
  static async inspect(options: { requestPermission?: boolean; acquirePosition?: boolean } = {}): Promise<WorkReadiness> {
    const permission = options.requestPermission
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    const locationPermissionGranted = permission.status === 'granted';
    const locationServicesEnabled = await Location.hasServicesEnabledAsync().catch(() => false);

    if (Platform.OS === 'android' && !nativeIntegrity) {
      throw new Error('Device compliance service is unavailable. Reinstall the official Perzent app.');
    }

    const native = nativeIntegrity
      ? await nativeIntegrity.getStatus()
      : {
          batteryLevel: 100,
          batteryCharging: false,
          powerSaveMode: false,
          developerOptionsEnabled: false,
        };

    const blockers: ComplianceBlocker[] = [];
    if (!locationPermissionGranted) {
      blockers.push({ code: 'LOCATION_PERMISSION', message: 'Allow precise location permission.' });
    }
    if (!locationServicesEnabled) {
      blockers.push({ code: 'LOCATION_SERVICES', message: 'Turn on Location Services (GPS).' });
    }
    if (Platform.OS === 'android' && native.developerOptionsEnabled) {
      blockers.push({ code: 'DEVELOPER_OPTIONS', message: 'Turn off Developer Options.' });
    }
    if (native.powerSaveMode) {
      blockers.push({ code: 'POWER_SAVER', message: 'Turn off Battery Saver / Power Saving mode.' });
    }
    if (native.batteryLevel < 5) {
      blockers.push({ code: 'LOW_BATTERY', message: 'Charge the phone to at least 5%.' });
    }

    let position: WorkReadiness['position'];
    let mockLocationDetected = false;
    if (options.acquirePosition && locationPermissionGranted && locationServicesEnabled) {
      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        mockLocationDetected = Boolean((current.coords as typeof current.coords & { mocked?: boolean }).mocked);
        if (mockLocationDetected) {
          blockers.push({ code: 'MOCK_LOCATION', message: 'Disable mock/fake location apps.' });
        } else {
          position = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            accuracy: current.coords.accuracy,
          };
        }
      } catch {
        blockers.push({ code: 'LOCATION_UNAVAILABLE', message: 'Move outdoors and wait for a verified GPS position.' });
      }
    }

    const telemetry: DeviceTelemetry = {
      battery_level: Math.max(0, Math.min(100, Math.round(native.batteryLevel))),
      battery_status: native.batteryCharging ? 'CHARGING' : 'DISCHARGING',
      battery_power_save: native.powerSaveMode,
      developer_options_enabled: native.developerOptionsEnabled,
      location_services_enabled: locationServicesEnabled,
      location_permission_granted: locationPermissionGranted,
      mock_location_detected: mockLocationDetected,
      updated_at: new Date().toISOString(),
    };

    return { ready: blockers.length === 0, blockers, position, telemetry };
  }

  static openAppSettings() {
    return Linking.openSettings();
  }
}
