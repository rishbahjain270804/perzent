import { Alert, Linking, Platform } from 'react-native';
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
      '3.0.0';
    const versionCode =
      Constants.expoConfig?.android?.versionCode ||
      (Application.nativeBuildVersion ? parseInt(Application.nativeBuildVersion, 10) : 3);
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

  static async manualCheck(onUpdateModal?: (info: AppVersionInfo) => void) {
    const current = this.getCurrentVersion();
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERSION}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) {
        Alert.alert('Update Check', `Connected to server. Current Version: v${current.version}.`);
        return;
      }
      const serverInfo: AppVersionInfo = await response.json();
      const isOutdated =
        serverInfo.latest_version_code > current.versionCode ||
        this.compareSemver(serverInfo.latest_version, current.version) > 0;

      if (isOutdated) {
        if (onUpdateModal) {
          onUpdateModal(serverInfo);
        } else {
          Alert.alert(
            'New Version Available!',
            `Version ${serverInfo.latest_version} (Build #${serverInfo.latest_version_code}) is ready for download.\n\n${serverInfo.release_notes || 'Includes stability and location upgrades.'}`,
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Download & Install',
                style: 'default',
                onPress: () => this.triggerInstall(serverInfo.download_url),
              },
            ]
          );
        }
      } else {
        Alert.alert(
          'Up to Date!',
          `You are running the latest version of Perzent Workforce (v${current.version} • Build #${current.versionCode}).`
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Check Complete',
        `Current app version is v${current.version}. Server response: ${error.message || 'Ready'}`
      );
    }
  }

  static triggerInstall(downloadUrl: string) {
    const url = downloadUrl || `${API_CONFIG.BASE_URL}/api/download/apk`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Download', `Please visit ${API_CONFIG.BASE_URL}/download in your browser.`);
    });
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
