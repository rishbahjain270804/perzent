import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { API_CONFIG } from '../config/api';

export interface AppVersionInfo {
  latest_version: string;
  latest_version_code: number;
  min_required_version_code: number;
  download_url: string;
  play_store_url: string | null;
  release_notes?: string;
  requires_reinstall_below_code?: number;
}

export interface UpdateDecision {
  info: AppVersionInfo;
  /** Current build is below min_required_version_code: the modal cannot be dismissed. */
  forced: boolean;
  /** Current build predates a signing-key change: the old app must be uninstalled first. */
  requiresReinstall: boolean;
}

const DISMISSED_KEY = 'perzent_dismissed_update_version_code';

export class AutoUpdateService {
  private static isChecking = false;

  static getCurrentVersion(): { version: string; versionCode: number } {
    const version =
      Application.nativeApplicationVersion ||
      Constants.expoConfig?.version ||
      '0.0.0';
    const nativeBuild = Application.nativeBuildVersion ? parseInt(Application.nativeBuildVersion, 10) : NaN;
    const versionCode = Number.isFinite(nativeBuild)
      ? nativeBuild
      : Constants.expoConfig?.android?.versionCode || 0;
    return { version, versionCode };
  }

  static async fetchVersionInfo(): Promise<AppVersionInfo | null> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERSION}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) return null;
      const raw = await response.json();
      if (!raw || typeof raw !== 'object') return null;
      return {
        latest_version: String(raw.latest_version || ''),
        latest_version_code: Number(raw.latest_version_code) || 0,
        min_required_version_code: Number(raw.min_required_version_code) || 0,
        download_url: String(raw.download_url || ''),
        play_store_url: typeof raw.play_store_url === 'string' && raw.play_store_url ? raw.play_store_url : null,
        release_notes: typeof raw.release_notes === 'string' ? raw.release_notes : undefined,
        requires_reinstall_below_code: Number(raw.requires_reinstall_below_code) || 0,
      };
    } catch {
      return null;
    }
  }

  /** Pure version rule from the backend contract. Returns null when up to date. */
  static evaluate(info: AppVersionInfo, currentCode = this.getCurrentVersion().versionCode): UpdateDecision | null {
    const outdated = info.latest_version_code > currentCode;
    if (!outdated) return null;
    return {
      info,
      forced: currentCode < info.min_required_version_code,
      requiresReinstall: currentCode < (info.requires_reinstall_below_code || 0),
    };
  }

  static async getDismissedVersionCode(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_KEY);
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  }

  static async dismiss(info: AppVersionInfo): Promise<void> {
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, String(info.latest_version_code));
    } catch {
      // ignore
    }
  }

  /**
   * Background check. Resolves with a decision only when the user should be prompted:
   * forced updates always, optional updates unless this exact version was dismissed.
   */
  static async checkForUpdates(): Promise<UpdateDecision | null> {
    if (this.isChecking) return null;
    this.isChecking = true;
    try {
      const info = await this.fetchVersionInfo();
      if (!info) return null;
      const decision = this.evaluate(info);
      if (!decision) return null;
      if (!decision.forced) {
        const dismissed = await this.getDismissedVersionCode();
        if (dismissed >= info.latest_version_code) return null;
      }
      return decision;
    } finally {
      this.isChecking = false;
    }
  }

  /** User-initiated check; ignores previous dismissals and always reports a result. */
  static async manualCheck(onUpdateModal?: (decision: UpdateDecision) => void): Promise<void> {
    const current = this.getCurrentVersion();
    const info = await this.fetchVersionInfo();
    if (!info) {
      Alert.alert(
        'Update check',
        `Could not reach the update server. Current version: v${current.version} (Build #${current.versionCode}).`
      );
      return;
    }
    const decision = this.evaluate(info, current.versionCode);
    if (!decision) {
      Alert.alert('Up to date', `You are running the latest version (v${current.version} • Build #${current.versionCode}).`);
      return;
    }
    if (onUpdateModal) {
      onUpdateModal(decision);
      return;
    }
    Alert.alert(
      decision.forced ? 'Update required' : 'New version available',
      this.describe(decision),
      decision.forced
        ? [{ text: 'Update now', onPress: () => this.openUpdate(info) }]
        : [
            { text: 'Later', style: 'cancel' },
            { text: 'Update now', onPress: () => this.openUpdate(info) },
          ]
    );
  }

  static describe(decision: UpdateDecision): string {
    const parts = [
      `Version ${decision.info.latest_version} (Build #${decision.info.latest_version_code}) is available.`,
    ];
    if (decision.info.release_notes) parts.push(decision.info.release_notes);
    if (decision.requiresReinstall) {
      parts.push(
        'Important: this update uses a new signing key. Uninstall the old Perzent app first, then install the new version.'
      );
    }
    return parts.join('\n\n');
  }

  /** Prefers the Play Store listing when the backend provides one. */
  static openUpdate(info: AppVersionInfo) {
    const url = info.play_store_url || info.download_url || `${API_CONFIG.BASE_URL}/api/download/apk`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Download', `Please visit ${API_CONFIG.BASE_URL}/download in your browser.`);
    });
  }
}
