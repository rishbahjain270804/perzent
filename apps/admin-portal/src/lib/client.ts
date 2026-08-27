/**
 * Client-side fetch helper for the owner portal.
 *
 * - Sends/accepts JSON
 * - Throws `ApiError(message, status)` built from the server's `{ error }` payload
 * - On 401 (outside /login and /register) redirects to `/login?next=<current path>`
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ApiInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | null;
  /** Convenience: serialised as the JSON body with the right content-type. */
  json?: unknown;
};

let redirecting = false;

function onAuthPage() {
  if (typeof window === 'undefined') return true;
  const path = window.location.pathname;
  return path.startsWith('/login') || path.startsWith('/register');
}

function redirectToLogin() {
  if (typeof window === 'undefined' || redirecting) return;
  redirecting = true;
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

function extractError(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'error' in data) {
    const value = (data as { error?: unknown }).error;
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

export async function apiFetch<T = unknown>(input: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, body: rawBody, ...rest } = init;
  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');
  let body: BodyInit | null | undefined = rawBody;
  if (json !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  let response: Response;
  try {
    response = await fetch(input, {
      cache: 'no-store',
      credentials: 'same-origin',
      ...rest,
      body,
      headers: finalHeaders,
    });
  } catch (reason) {
    if (isAbortError(reason)) throw reason;
    throw new ApiError('Network error — check your connection and try again.', 0);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (response.status === 401 && !onAuthPage()) {
    redirectToLogin();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    throw new ApiError(extractError(data, `Request failed (${response.status})`), response.status);
  }

  return data as T;
}

export function isAbortError(reason: unknown) {
  return reason instanceof DOMException
    ? reason.name === 'AbortError'
    : typeof reason === 'object' && reason !== null && (reason as { name?: string }).name === 'AbortError';
}

export function errorMessage(reason: unknown, fallback = 'Something went wrong. Please try again.') {
  if (reason instanceof ApiError) return reason.message;
  if (reason instanceof Error && reason.message) return reason.message;
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export type PortalRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE';

export interface CompanyInfo {
  name: string;
  timezone: string;
  auto_checkout_time: string;
  max_break_minutes: number;
  route_retention_days: number;
  attendance_retention_days: number;
  standard_daily_hours: number;
  plan_tier: string;
}

export interface SessionInfo {
  user_id: string;
  company_id: string;
  role: PortalRole;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  company: CompanyInfo;
}

/* ------------------------------------------------------------------ */
/* Timezones & dates                                                   */
/* ------------------------------------------------------------------ */

export const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Asia/Kolkata', label: 'India — Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'UAE — Asia/Dubai (UTC+4)' },
  { value: 'Asia/Singapore', label: 'Singapore — Asia/Singapore (UTC+8)' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia — Asia/Riyadh (UTC+3)' },
  { value: 'Europe/London', label: 'UK — Europe/London' },
  { value: 'America/New_York', label: 'US East — America/New_York' },
  { value: 'UTC', label: 'UTC' },
];

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/** Today's calendar date (YYYY-MM-DD) in the given IANA timezone. */
export function todayInTimezone(timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString('en-CA');
  }
}

/** Adds `days` to a YYYY-MM-DD string using UTC arithmetic (no DST surprises). */
export function shiftDate(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return ymd;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isValidYmd(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function formatTime(iso?: string | null, timeZone?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timeZone || undefined });
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function formatDateTime(iso?: string | null, timeZone?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return date.toLocaleString([], {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timeZone || undefined,
    });
  } catch {
    return date.toLocaleString();
  }
}

export function formatDate(iso?: string | null, timeZone?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', timeZone: timeZone || undefined });
  } catch {
    return date.toLocaleDateString();
  }
}

export function relativeTime(iso?: string | null, now: number = Date.now()): string {
  if (!iso) return 'never';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'unknown';
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(then).toLocaleDateString();
}

export function minutesToHours(minutes: number | null | undefined): string {
  return ((minutes || 0) / 60).toFixed(1);
}
