import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export class DeviceBindingService {
  private static SESSION_KEY = 'perzent_mobile_session';
  private static INSTALLATION_KEY = 'perzent_installation_id';

  public static async getDeviceFingerprint() {
    let deviceUuid = Platform.OS === 'android' ? Application.getAndroidId() : null;
    if (!deviceUuid) deviceUuid = await SecureStore.getItemAsync(this.INSTALLATION_KEY);
    if (!deviceUuid) {
      deviceUuid = `install-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await SecureStore.setItemAsync(this.INSTALLATION_KEY, deviceUuid);
    }
    const manufacturer = Device.manufacturer?.trim();
    const model = (Device.modelName || Device.designName || Device.productName)?.trim();
    const alreadyIncludesManufacturer = Boolean(
      manufacturer && model?.toLocaleLowerCase().includes(manufacturer.toLocaleLowerCase())
    );
    const deviceModel = [alreadyIncludesManufacturer ? null : manufacturer, model]
      .filter(Boolean)
      .join(' ');

    return {
      device_uuid: deviceUuid,
      device_model: deviceModel || 'Unknown Android device',
      os_version: `${Device.osName || Platform.OS} ${Device.osVersion || Platform.Version}`,
    };
  }

  public static async saveSession(user: any) {
    await SecureStore.setItemAsync(this.SESSION_KEY, JSON.stringify(user));
  }

  public static async getSavedSession() {
    const data = await SecureStore.getItemAsync(this.SESSION_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      await SecureStore.deleteItemAsync(this.SESSION_KEY);
      return null;
    }
  }

  public static async clearSession() {
    await SecureStore.deleteItemAsync(this.SESSION_KEY);
  }
}
