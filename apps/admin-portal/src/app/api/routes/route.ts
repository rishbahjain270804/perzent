import { NextResponse } from 'next/server';
import { getStore } from '@perzent/database';
import { SYSTEM_CONFIG, DailyRoutePlayback } from '@perzent/shared-types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id') || 'user-amit-employee';
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // 15-day Free Tier Retention Limit enforcement
  const reqDate = new Date(dateStr);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - SYSTEM_CONFIG.ROUTE_HISTORY_RETENTION_DAYS);
  cutoffDate.setHours(0, 0, 0, 0);

  if (reqDate < cutoffDate) {
    return NextResponse.json(
      { error: `Route history is limited to the past ${SYSTEM_CONFIG.ROUTE_HISTORY_RETENTION_DAYS} days on the Free tier.` },
      { status: 403 }
    );
  }

  const store = getStore();
  const user = store.users.find((u) => u.id === userId);
  const stops = store.locationStops.filter((s) => s.user_id === userId);
  const waypoints = store.locationWaypoints.filter((w) => w.user_id === userId);
  const breaks = store.attendanceBreaks.filter((b) => b.attendance_id === 'att-amit-today');

  const playback: DailyRoutePlayback = {
    user_id: userId,
    user_name: user ? user.full_name : 'Amit Kumar',
    date: dateStr,
    total_distance_km: 14.8,
    stops: stops.map((s) => ({
      id: s.id,
      address_name: s.address_name || 'Site Location',
      latitude: s.latitude,
      longitude: s.longitude,
      start_time: s.start_time,
      end_time: s.end_time,
      duration_minutes: Math.round(s.dwell_duration_seconds / 60),
    })),
    waypoints: waypoints.map((w) => ({
      id: w.id,
      latitude: w.latitude,
      longitude: w.longitude,
      speed: w.speed,
      heading: w.heading,
      accuracy: w.accuracy,
      recorded_at: w.recorded_at,
    })),
    break_intervals: breaks.map((b) => ({
      start_time: b.start_time,
      end_time: b.end_time || new Date().toISOString(),
      duration_minutes: b.duration_minutes || 15,
    })),
  };

  return NextResponse.json(playback);
}
