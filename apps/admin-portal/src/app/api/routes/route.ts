import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
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
      },
      include: { company: true },
    });
    if (!user) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const requestedDate = new Date(`${dateStr}T00:00:00.000Z`);
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - (user.company?.route_retention_days || 15));
    cutoff.setUTCHours(0, 0, 0, 0);
    if (requestedDate < cutoff) {
      return NextResponse.json(
        { error: `Route history is limited to the past ${user.company?.route_retention_days || 15} days.` },
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
    const waypoints: any[] = attendance?.waypoints || [];
    const totalMeters = waypoints.slice(1).reduce((sum: number, point: any, index: number) => sum + calculateHaversineDistance(
      { latitude: waypoints[index].latitude, longitude: waypoints[index].longitude },
      { latitude: point.latitude, longitude: point.longitude }
    ), 0);

    return NextResponse.json({
      user_id: user.id,
      user_name: user.full_name,
      date: dateStr,
      total_distance_km: Number((totalMeters / 1000).toFixed(2)),
      stops: (attendance?.stops || []).map((stop: any) => ({
        id: stop.id,
        address_name: stop.address_name || 'Site location',
        latitude: stop.latitude,
        longitude: stop.longitude,
        start_time: typeof stop.start_time === 'string' ? stop.start_time : stop.start_time?.toISOString?.() || new Date().toISOString(),
        end_time: typeof stop.end_time === 'string' ? stop.end_time : stop.end_time?.toISOString?.() || new Date().toISOString(),
        duration_minutes: stop.duration_minutes || Math.round((stop.dwell_duration_seconds || 0) / 60),
      })),
      waypoints: waypoints.map((point: any) => ({
        id: point.id,
        latitude: point.latitude,
        longitude: point.longitude,
        speed: point.speed || 0,
        heading: point.heading || 0,
        accuracy: point.accuracy || 10,
        recorded_at: typeof point.recorded_at === 'string' ? point.recorded_at : point.recorded_at?.toISOString?.() || new Date().toISOString(),
      })),
      break_intervals: (attendance?.breaks || []).map((item: any) => ({
        start_time: typeof item.start_time === 'string' ? item.start_time : item.start_time?.toISOString?.() || new Date().toISOString(),
        end_time: typeof item.end_time === 'string' ? item.end_time : item.end_time?.toISOString?.() || item.start_time?.toISOString?.() || new Date().toISOString(),
        duration_minutes: item.duration_minutes || 0,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
