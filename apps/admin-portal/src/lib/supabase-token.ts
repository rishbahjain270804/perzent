import { createHmac } from 'crypto';

/**
 * Mints Supabase-compatible JWTs so phones and browsers can call the database-direct RPC functions
 * (PostgREST) without going through the Next.js API. Requires SUPABASE_JWT_SECRET (Supabase dashboard
 * → Project Settings → API → JWT Secret). When it is not configured, `supabaseDirectConfig()` returns
 * null and clients keep using the API routes.
 */

const SECRET = process.env.SUPABASE_JWT_SECRET || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || (() => {
  const url = process.env.DATABASE_URL || '';
  const match = url.match(/postgres\.([a-z0-9]{20})/);
  return match ? match[1] : '';
})();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || (PROJECT_REF ? `https://${PROJECT_REF}.supabase.co` : '');

/** Access tokens for the hot path are short-lived; clients refresh via GET /api/auth. */
export const DIRECT_TOKEN_TTL_SECONDS = 12 * 60 * 60;

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

export function signSupabaseJwt(payload: Record<string, unknown>, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iss: 'supabase', iat: now, exp: now + ttlSeconds, ...payload }));
  const signature = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export const supabaseDirectEnabled = () => Boolean(SECRET && SUPABASE_URL);

let cachedAnonKey: string | null = null;
/** A role=anon JWT acts as the PostgREST `apikey`; it grants nothing by itself (RLS deny-all). */
function anonKey() {
  if (!cachedAnonKey) cachedAnonKey = signSupabaseJwt({ role: 'anon', ref: PROJECT_REF }, 10 * 365 * 24 * 3600);
  return cachedAnonKey;
}

export type SupabaseDirectConfig = {
  url: string;
  anon_key: string;
  token: string;
  expires_at: string;
};

/** Per-user config returned by login / session endpoints; null when the feature is not configured. */
export function supabaseDirectConfig(user: { id: string; company_id: string; role: string }): SupabaseDirectConfig | null {
  if (!supabaseDirectEnabled()) return null;
  const token = signSupabaseJwt(
    { sub: user.id, role: 'authenticated', aud: 'authenticated', company_id: user.company_id, app_role: user.role },
    DIRECT_TOKEN_TTL_SECONDS
  );
  return {
    url: SUPABASE_URL,
    anon_key: anonKey(),
    token,
    expires_at: new Date(Date.now() + DIRECT_TOKEN_TTL_SECONDS * 1000).toISOString(),
  };
}
