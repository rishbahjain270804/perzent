export class DeviceBindingService {
  private static STORAGE_KEY_SESSION = 'perzent_mobile_session';

  public static getDeviceFingerprint(): { device_uuid: string; device_model: string; os_version: string } {
    return {
      device_uuid: 'DEV-SAMSUNG-A54-8899',
      device_model: 'Samsung Galaxy A54 5G',
      os_version: 'Android 14 (OneUI 6.1)',
    };
  }

  public static saveSession(user: any): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify(user));
    }
  }

  public static getSavedSession(): any | null {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(this.STORAGE_KEY_SESSION);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }
}
