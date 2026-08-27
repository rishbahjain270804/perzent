/**
 * Browser-side database-direct access (Supabase PostgREST RPC) for the live map. The session from
 * GET /api/auth carries `supabase` when the backend has SUPABASE_JWT_SECRET configured; otherwise
 * `directRpc` returns null and pages keep polling the API routes.
 */
import { apiFetch, type SessionInfo } from './client';

export type DirectConfig = { url: string; anon_key: string; token: string; expires_at: string };

export type LivePositionRow = {
  user_id: string;
  full_name: string;
  shift_status: 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT' | 'OFF_DUTY';
  latitude: number | null;
  longitude: number | null;
  heading: number;
  speed: number;
  accuracy: number;
  last_point_at: string | null;
  last_seen_at: string | null;
  battery_level: number | null;
  gps_enabled: boolean;
  mock_location: boolean;
  punch_in_time: string | null;
};

let cached: DirectConfig | null = null;
let refreshing: Promise<DirectConfig | null> | null = null;

export function directConfigFromSession(session: (SessionInfo & { supabase?: DirectConfig | null }) | null | undefined): DirectConfig | null {
  const cfg = session?.supabase;
  if (cfg && typeof cfg.url === 'string' && typeof cfg.token === 'string') cached = cfg;
  return cached;
}

async function refresh(): Promise<DirectConfig | null> {
  if (!refreshing) {
    refreshing = apiFetch<SessionInfo & { supabase?: DirectConfig | null }>('/api/auth')
      .then((data) => {
        cached = data?.supabase ?? null;
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** Returns null when direct access is not configured; throws on hard failures. */
export async function directRpc<T>(fn: string, args: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T | null> {
  let cfg = cached;
  if (!cfg) return null;
  if (Date.parse(cfg.expires_at) - Date.now() < 30 * 60 * 1000) cfg = (await refresh()) || cfg;

  const call = async (config: DirectConfig) =>
    fetch(`${config.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.anon_key, Authorization: `Bearer ${config.token}` },
      body: JSON.stringify(args),
      signal,
    });

  let response = await call(cfg);
  if (response.status === 401 || response.status === 403) {
    const fresh = await refresh();
    if (fresh) response = await call(fresh);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Live positions request failed (${response.status})`);
  }
  return (await response.json()) as T;
}
