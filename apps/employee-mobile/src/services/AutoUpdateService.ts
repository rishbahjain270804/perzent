import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { API_CONFIG } from '../config/api';

export interface AppVersionInfo {
  latest_version: string;
  latest_version_code: number;
  min_required_version: string;
  download_url: string;
  force_update: boolean;
  release_notes?: string;
}

export class AutoUpdateService {
  private static isChecking = false;
  private static updatePrompted = false;

  static getCurrentVersion(): { version: string; versionCode: number } {
    const version =
      Constants.expoConfig?.version ||
      Application.nativeApplicationVersion ||
      '1.0.0';
    const versionCode =
      Constants.expoConfig?.android?.versionCode ||
      (Application.nativeBuildVersion ? parseInt(Application.nativeBuildVersion, 10) : 1);
    return { version, versionCode };
  }

  static async checkForUpdates(onUpdateDetected?: (info: AppVersionInfo) => void): Promise<AppVersionInfo | null> {
    if (this.isChecking) return null;
    this.isChecking = true;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERSION}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) return null;

      const serverInfo: AppVersionInfo = await response.json();
      const current = this.getCurrentVersion();

      const isOutdated =
        serverInfo.latest_version_code > current.versionCode ||
        this.compareSemver(serverInfo.latest_version, current.version) > 0;

      if (isOutdated) {
        if (onUpdateDetected) {
          onUpdateDetected(serverInfo);
        } else if (!this.updatePrompted) {
          this.updatePrompted = true;
          // Trigger automatic update download/install
          this.triggerInstall(serverInfo.download_url);
        }
        return serverInfo;
      }
      return null;
    } catch {
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  static triggerInstall(downloadUrl: string) {
    if (!downloadUrl) return;
    Linking.openURL(downloadUrl).catch(() => undefined);
  }

  private static compareSemver(v1: string, v2: string): number {
    const p1 = v1.split('.').map((n) => parseInt(n, 10) || 0);
    const p2 = v2.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }
}
