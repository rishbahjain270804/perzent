import { API_CONFIG } from '../config/api';
import { DeviceBindingService } from './DeviceBindingService';
import { SessionEvents } from './SessionEvents';

/**
 * Database-direct access (Supabase PostgREST RPC) for the high-volume paths: GPS ingestion,
 * device heartbeat and shift-state sync. The API login returns `session.supabase` when the
 * backend has SUPABASE_JWT_SECRET configured; otherwise every method here returns `null` and the
 * callers fall back to the Next.js API routes.
 */

export type DirectConfig = {
  url: string;
  anon_key: string;
  token: string;
  expires_at: string;
};

export type DirectResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

const REFRESH_BEFORE_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;

let refreshing: Promise<DirectConfig | null> | null = null;

export class DirectAccess {
  static config(session: any): DirectConfig | null {
    const cfg = session?.supabase;
    if (!cfg || typeof cfg.url !== 'string' || typeof cfg.token !== 'string' || typeof cfg.anon_key !== 'string') return null;
    return cfg as DirectConfig;
  }

  static enabled(session: any): boolean {
    return this.config(session) !== null;
  }

  private static expiresSoon(cfg: DirectConfig): boolean {
    const at = Date.parse(cfg.expires_at);
    return !Number.isFinite(at) || at - Date.now() < REFRESH_BEFORE_MS;
  }

  /** Re-fetches the session from the API (which mints a fresh direct token) and persists it. */
  static async refresh(session: any): Promise<DirectConfig | null> {
    if (!session?.token) return null;
    if (!refreshing) {
      refreshing = (async () => {
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH_LOGIN}`, {
            headers: { Authorization: `Bearer ${session.token}` },
          });
          if (response.status === 401) {
            SessionEvents.emitUnauthorized();
            return null;
          }
          if (!response.ok) return null;
          const data = await response.json();
          if (data?.supabase) {
            session.supabase = data.supabase; // the session object is shared by reference across services
            await DeviceBindingService.saveSession(session).catch(() => undefined);
            return data.supabase as DirectConfig;
          }
          return null;
        } catch {
          return null;
        } finally {
          refreshing = null;
        }
      })();
    }
    return refreshing;
  }

  /** Calls a PostgREST RPC function; refreshes the token once on 401/403 or when it is about to expire. */
  static async rpc<T = any>(session: any, fn: string, args: Record<string, unknown>): Promise<DirectResult<T> | null> {
    let cfg = this.config(session);
    if (!cfg) return null;
    if (this.expiresSoon(cfg)) cfg = (await this.refresh(session)) || cfg;

    const attempt = async (config: DirectConfig): Promise<DirectResult<T>> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: config.anon_key,
            Authorization: `Bearer ${config.token}`,
          },
          body: JSON.stringify(args),
          signal: controller.signal,
        });
        const text = await response.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
        if (response.ok) return { ok: true, data: data as T };
        return { ok: false, status: response.status, message: data?.message || data?.hint || `HTTP ${response.status}` };
      } catch (error: any) {
        return { ok: false, status: 0, message: error?.name === 'AbortError' ? 'timeout' : 'network' };
      } finally {
        clearTimeout(timer);
      }
    };

    let result = await attempt(cfg);
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      const fresh = await this.refresh(session);
      if (fresh) result = await attempt(fresh);
      if (!result.ok && (result.status === 401 || result.status === 403)) SessionEvents.emitUnauthorized();
    }
    return result;
  }
}
