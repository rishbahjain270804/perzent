import { API_CONFIG } from '../config/api';

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
  server_time: new Date().toISOString(),
};

export const REMOTE_STATUS_POLL_MS = 5 * 60 * 1000;

export class RemoteConfigService {
  static last: RemoteStatus = DEFAULT_STATUS;

  static async fetch(timeoutMs = 12_000): Promise<StatusFetch> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/status`, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      if (!response.ok) return { ok: false, reason: 'SERVER', httpStatus: response.status };
      const raw = await response.json();
      const status = this.normalize(raw);
      this.last = status;
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
      server_time: typeof raw?.server_time === 'string' ? raw.server_time : new Date().toISOString(),
    };
  }
}
