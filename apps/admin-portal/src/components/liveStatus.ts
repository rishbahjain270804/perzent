import type { LiveTeamMember } from '@perzent/shared-types';

/**
 * Live-team member as returned by GET /api/live-team. The extra fields are being added to the shared
 * type concurrently; keeping them optional here means this compiles before and after that lands.
 */
export type LiveMember = LiveTeamMember & {
  punch_in_time?: string | null;
  punch_out_time?: string | null;
  is_gps_disconnected?: boolean;
  seconds_since_last_ping?: number | null;
  tamper_reason?: string | null;
};

export type Freshness = 'live' | 'stale' | 'disconnected' | 'idle';

export const STALE_AFTER_SECONDS = 60;
export const DISCONNECTED_AFTER_SECONDS = 120;

export function isOnShift(member: Pick<LiveMember, 'shift_status'>) {
  return member.shift_status === 'CHECKED_IN' || member.shift_status === 'ON_BREAK';
}

/** Seconds since the last GPS ping, preferring the server's value. */
export function secondsSincePing(member: LiveMember, now: number = Date.now()): number | null {
  if (typeof member.seconds_since_last_ping === 'number' && Number.isFinite(member.seconds_since_last_ping)) {
    return Math.max(0, member.seconds_since_last_ping);
  }
  const ping = member.current_location?.last_ping_at;
  if (!ping) return null;
  const then = Date.parse(ping);
  if (Number.isNaN(then)) return null;
  return Math.max(0, (now - then) / 1000);
}

/**
 * live: on shift and pinged < 60 s ago
 * stale: on shift, last ping 60–120 s ago
 * disconnected: on shift, > 120 s or the server flagged GPS/network loss
 * idle: checked out / off duty (static grey dot, no freshness pill)
 */
export function freshnessOf(member: LiveMember, now: number = Date.now()): Freshness {
  if (!isOnShift(member)) return 'idle';
  if (member.is_gps_disconnected) return 'disconnected';
  const seconds = secondsSincePing(member, now);
  if (seconds == null) return 'disconnected';
  if (seconds < STALE_AFTER_SECONDS) return 'live';
  if (seconds <= DISCONNECTED_AFTER_SECONDS) return 'stale';
  return 'disconnected';
}

export function freshnessLabel(freshness: Freshness, seconds: number | null): string {
  switch (freshness) {
    case 'live':
      return 'Live';
    case 'stale':
      return `Stale ${Math.round(seconds ?? 0)}s`;
    case 'disconnected':
      return 'GPS/Net lost';
    default:
      return '';
  }
}

export function speedKmh(member: LiveMember): number {
  const speed = member.current_location?.speed;
  return speed && speed > 0 ? Math.round(speed * 3.6) : 0;
}

export const SHIFT_META: Record<LiveMember['shift_status'], { label: string; color: string; surface: string }> = {
  CHECKED_IN: { label: 'On duty', color: '#16a34a', surface: '#dcfce7' },
  ON_BREAK: { label: 'On break', color: '#d97706', surface: '#fef3c7' },
  CHECKED_OUT: { label: 'Checked out', color: '#64748b', surface: '#e2e8f0' },
  OFF_DUTY: { label: 'Off duty', color: '#94a3b8', surface: '#f1f5f9' },
};
