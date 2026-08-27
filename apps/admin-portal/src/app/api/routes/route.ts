import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { calculateTrailDistanceMeters, detectStops } from '@perzent/location-engine';
import { DATE_ONLY_REGEX, SYSTEM_CONFIG, type DailyRoutePlayback } from '@perzent/shared-types';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { getCompanyPolicy } from '@/lib/policy';
import { addDays, localDateString, workDateFromString, zonedTimeToUtc } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const policy = await getCompanyPolicy(session.companyId);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const dateStr = searchParams.get('date') || localDateString(policy.timezone);
    if (!userId || !DATE_ONLY_REGEX.test(dateStr) || Number.isNaN(workDateFromString(dateStr).getTime())) {
      return jsonError('A valid user_id and date (YYYY-MM-DD) are required', 400, 'VALIDATION');
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        company_id: session.companyId,
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
      },
    });
    if (!user) return jsonError('Employee not found', 404, 'NOT_FOUND');

    const oldestAllowed = localDateString(policy.timezone, addDays(new Date(), -policy.route_retention_days));
    if (dateStr < oldestAllowed) {
      return jsonError(`Route history is kept for ${policy.route_retention_days} days.`, 403, 'RETENTION');
    }

    const workDate = workDateFromString(dateStr);
    const dayStart = zonedTimeToUtc(dateStr, '00:00', policy.timezone);
    const dayEnd = addDays(dayStart, 1);

    const attendance = await prisma.attendanceRecord.findUnique({
      where: { user_id_work_date: { user_id: user.id, work_date: workDate } },
      include: {
        waypoints: { orderBy: { recorded_at: 'asc' } },
        breaks: { orderBy: { start_time: 'asc' } },
      },
    });

    let points = attendance?.waypoints ?? [];
    if (points.length === 0) {
      points = await prisma.locationWaypoint.findMany({
        where: { user_id: user.id, recorded_at: { gte: dayStart, lt: dayEnd } },
        orderBy: { recorded_at: 'asc' },
      });
    }
    if (points.length === 0 && attendance?.punch_in_lat != null && attendance?.punch_in_lng != null) {
      points = [
        {
          id: `punch-in-${attendance.id}`,
          attendance_id: attendance.id,
          user_id: user.id,
          latitude: attendance.punch_in_lat,
          longitude: attendance.punch_in_lng,
          speed: 0,
          heading: 0,
          accuracy: 25,
          recorded_at: attendance.punch_in_time,
        },
      ];
    }

    const clean = points.filter((p) => p.accuracy <= SYSTEM_CONFIG.MAX_ACCEPTED_ACCURACY_METERS);
    const trail = clean.length > 0 ? clean : points;
    const stops = detectStops(trail, {
      radiusMeters: SYSTEM_CONFIG.STATIONARY_RADIUS_METERS,
      minDurationSeconds: SYSTEM_CONFIG.MIN_STOP_DURATION_SECONDS,
    });

    const playback: DailyRoutePlayback = {
      user_id: user.id,
      user_name: user.full_name,
      date: dateStr,
      total_distance_km: Number((calculateTrailDistanceMeters(trail) / 1000).toFixed(2)),
      stops: stops.map((stop, index) => ({
        id: `stop-${index + 1}`,
        address_name: `Stop ${index + 1} · ${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}`,
        latitude: stop.latitude,
        longitude: stop.longitude,
        start_time: stop.start_time.toISOString(),
        end_time: stop.end_time.toISOString(),
        duration_minutes: Math.round(stop.duration_seconds / 60),
      })),
      waypoints: trail.map((point) => ({
        id: point.id,
        latitude: point.latitude,
        longitude: point.longitude,
        speed: point.speed,
        heading: point.heading,
        accuracy: point.accuracy,
        recorded_at: point.recorded_at.toISOString(),
      })),
      break_intervals: (attendance?.breaks ?? []).map((item) => ({
        start_time: item.start_time.toISOString(),
        end_time: (item.end_time ?? new Date()).toISOString(),
        duration_minutes: item.duration_minutes,
      })),
    };
    return NextResponse.json(playback);
  } catch (error) {
    return authErrorResponse(error);
  }
}
