import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import type { AttendanceBreak, LocationStop, LocationWaypoint } from '@prisma/client';
import { calculateHaversineDistance } from '@perzent/location-engine';
import { authErrorResponse, requireSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: 'A valid user_id and date are required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        company_id: session.companyId,
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
      },
      include: { company: { select: { route_retention_days: true } } },
    });
    if (!user) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const requestedDate = new Date(`${dateStr}T00:00:00.000Z`);
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - user.company.route_retention_days);
    cutoff.setUTCHours(0, 0, 0, 0);
    if (requestedDate < cutoff) {
      return NextResponse.json(
        { error: `Route history is limited to the past ${user.company.route_retention_days} days.` },
        { status: 403 }
      );
    }

    const attendance = await prisma.attendanceRecord.findUnique({
      where: { user_id_work_date: { user_id: user.id, work_date: requestedDate } },
      include: {
        stops: { orderBy: { start_time: 'asc' } },
        waypoints: { orderBy: { recorded_at: 'asc' } },
        breaks: { orderBy: { start_time: 'asc' } },
      },
    });
    const waypoints: LocationWaypoint[] = attendance?.waypoints || [];
    const totalMeters = waypoints.slice(1).reduce((sum: number, point: LocationWaypoint, index: number) => sum + calculateHaversineDistance(
      { latitude: waypoints[index].latitude, longitude: waypoints[index].longitude },
      { latitude: point.latitude, longitude: point.longitude }
    ), 0);

    return NextResponse.json({
      user_id: user.id,
      user_name: user.full_name,
      date: dateStr,
      total_distance_km: Number((totalMeters / 1000).toFixed(2)),
      stops: (attendance?.stops || []).map((stop: LocationStop) => ({
        id: stop.id,
        address_name: stop.address_name || 'Site location',
        latitude: stop.latitude,
        longitude: stop.longitude,
        start_time: stop.start_time.toISOString(),
        end_time: stop.end_time.toISOString(),
        duration_minutes: Math.round(stop.dwell_duration_seconds / 60),
      })),
      waypoints: waypoints.map((point: LocationWaypoint) => ({
        id: point.id,
        latitude: point.latitude,
        longitude: point.longitude,
        speed: point.speed,
        heading: point.heading,
        accuracy: point.accuracy,
        recorded_at: point.recorded_at.toISOString(),
      })),
      break_intervals: (attendance?.breaks || []).map((item: AttendanceBreak) => ({
        start_time: item.start_time.toISOString(),
        end_time: item.end_time?.toISOString() || item.start_time.toISOString(),
        duration_minutes: item.duration_minutes || 0,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
