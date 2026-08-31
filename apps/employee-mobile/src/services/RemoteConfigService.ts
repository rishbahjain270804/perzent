import AsyncStorage from '@react-native-async-storage/async-storage';
import { REMOTE_CONFIG_DEFAULTS, resolveRemoteConfig, type RemoteConfig } from '@perzent/shared-types';
import { API_CONFIG, DEFAULT_API_BASE_URL } from '../config/api';
import { runtime } from '../config/runtime';

const CONFIG_STORAGE_KEY = 'perzent_remote_config_v1';

/**
 * Remote status controlled from the AppConfig database row: maintenance mode, announcements and
 * support contact. Fetched from GET /api/status (public, cached) on launch, on resume and every
 * 5 minutes; a 503 { code: 'MAINTENANCE' } from any action also switches maintenance on locally.
 */
export type RemoteMaintenance = {
  enabled: boolean;
  scope: 'ALL' | 'MOBILE' | 'WEB';
  mobile: boolean;
  web: boolean;
  title: string;
  message: string;
  until: string | null;
};

export type RemoteAnnouncement = { text: string; level: 'INFO' | 'WARNING' | 'CRITICAL' } | null;

export type RemoteStatus = {
  maintenance: RemoteMaintenance;
  announcement: RemoteAnnouncement;
  support: { email: string | null; phone: string | null };
  /** Every tunable the app reads (intervals, GPS gates, feature switches, copy) — see shared-types remote-config.ts. */
  config: RemoteConfig;
  server_time: string;
};

export type StatusFetch =
  | { ok: true; status: RemoteStatus }
  /** The device has no route to the server (offline or DNS) */
  | { ok: false; reason: 'NETWORK' }
  /** The server answered but not usefully (5xx, HTML error page, timeout) */
  | { ok: false; reason: 'SERVER'; httpStatus?: number };

const DEFAULT_STATUS: RemoteStatus = {
  maintenance: { enabled: false, scope: 'ALL', mobile: false, web: false, title: '', message: '', until: null },
  announcement: null,
  support: { email: null, phone: null },
  config: REMOTE_CONFIG_DEFAULTS,
  server_time: new Date().toISOString(),
};

export const REMOTE_STATUS_POLL_MS = 5 * 60 * 1000;

export class RemoteConfigService {
  static last: RemoteStatus = DEFAULT_STATUS;

  /** The current remote configuration (defaults until the first successful fetch or hydrate). */
  static get config(): RemoteConfig {
    return this.last.config;
  }

  /** Restores the last fetched config from disk so the app starts with the right tunables offline. */
  static async hydrate(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
      if (!stored) return;
      this.applyConfig(resolveRemoteConfig(JSON.parse(stored)));
    } catch {
      // Defaults stay in place.
    }
  }

  private static applyConfig(config: RemoteConfig) {
    this.last = { ...this.last, config };
    runtime.apiBaseUrl = config.api_base_url && config.api_base_url !== DEFAULT_API_BASE_URL ? config.api_base_url : null;
  }

  static async fetch(timeoutMs = 12_000): Promise<StatusFetch> {
    const first = await this.fetchFrom(API_CONFIG.BASE_URL, timeoutMs);
    if (first.ok || !runtime.apiBaseUrl) return first;
    // A remote base-URL override that stopped answering must never brick the app: fall back to the
    // built-in host, which also lets a corrected override reach the device.
    const fallback = await this.fetchFrom(DEFAULT_API_BASE_URL, timeoutMs);
    if (fallback.ok) runtime.apiBaseUrl = null;
    return fallback.ok ? fallback : first;
  }

  private static async fetchFrom(baseUrl: string, timeoutMs: number): Promise<StatusFetch> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/api/status`, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      if (!response.ok) return { ok: false, reason: 'SERVER', httpStatus: response.status };
      const raw = await response.json();
      const status = this.normalize(raw);
      this.last = status;
      this.applyConfig(status.config);
      AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(raw?.config ?? {})).catch(() => undefined);
      return { ok: true, status };
    } catch (error: any) {
      if (error?.name === 'AbortError') return { ok: false, reason: 'SERVER' };
      return { ok: false, reason: 'NETWORK' };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Builds a maintenance status from a 503 MAINTENANCE API error payload. */
  static fromMaintenanceError(payload: any): RemoteStatus {
    const m = payload?.maintenance || {};
    const status: RemoteStatus = {
      ...this.last,
      maintenance: {
        enabled: true,
        scope: m.scope || 'ALL',
        mobile: true,
        web: Boolean(m.web),
        title: m.title || 'Perzent is under maintenance',
        message: m.message || payload?.error || 'Please try again in a little while.',
        until: m.until || null,
      },
    };
    this.last = status;
    return status;
  }

  private static normalize(raw: any): RemoteStatus {
    const m = raw?.maintenance || {};
    const a = raw?.announcement;
    return {
      maintenance: {
        enabled: Boolean(m.enabled),
        scope: m.scope === 'MOBILE' || m.scope === 'WEB' ? m.scope : 'ALL',
        mobile: Boolean(m.mobile),
        web: Boolean(m.web),
        title: typeof m.title === 'string' ? m.title : '',
        message: typeof m.message === 'string' ? m.message : '',
        until: typeof m.until === 'string' ? m.until : null,
      },
      announcement:
        a && typeof a.text === 'string' && a.text.trim()
          ? { text: a.text.trim(), level: a.level === 'WARNING' || a.level === 'CRITICAL' ? a.level : 'INFO' }
          : null,
      support: { email: raw?.support?.email || null, phone: raw?.support?.phone || null },
      config: resolveRemoteConfig(raw?.config),
      server_time: typeof raw?.server_time === 'string' ? raw.server_time : new Date().toISOString(),
    };
  }
}
