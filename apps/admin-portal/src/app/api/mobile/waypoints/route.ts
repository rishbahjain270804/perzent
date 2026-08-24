import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

const startOfTodayUtc = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE']);
    const body = await request.json();
    const attendance = await prisma.attendanceRecord.findUnique({
      where: {
        user_id_work_date: {
          user_id: session.userId,
          work_date: startOfTodayUtc(),
        },
      },
    });

    if (!attendance || ['CHECKED_OUT', 'AUTO_CHECKED_OUT'].includes(attendance.status)) {
      return NextResponse.json({ error: 'No active attendance session' }, { status: 409 });
    }

    const rawPoints = Array.isArray(body.waypoints) ? body.waypoints : [body];
    const points = rawPoints
      .filter((point: any) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
      .map((point: any) => ({
        attendance_id: attendance.id,
        user_id: session.userId,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: Number.isFinite(point.accuracy) ? point.accuracy : 0,
        speed: Number.isFinite(point.speed) ? point.speed : 0,
        heading: Number.isFinite(point.heading) ? point.heading : 0,
        recorded_at: point.recorded_at ? new Date(point.recorded_at) : new Date(),
      }))
      .filter((point: any) => !Number.isNaN(point.recorded_at.getTime()));

    if (points.length === 0) {
      return NextResponse.json({ error: 'At least one valid GPS waypoint is required' }, { status: 400 });
    }

    const [created] = await prisma.$transaction([
      prisma.locationWaypoint.createMany({ data: points }),
      prisma.userDevice.updateMany({
        where: { user_id: session.userId, is_active: true },
        data: { last_seen_at: new Date() },
      }),
    ]);

    const total = await prisma.locationWaypoint.count({
      where: { attendance_id: attendance.id },
    });

    return NextResponse.json({ ingested: created.count, total_waypoints: total });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE']);
    const waypoints = await prisma.locationWaypoint.findMany({
      where: {
        user_id: session.userId,
        recorded_at: { gte: startOfTodayUtc() },
      },
      orderBy: { recorded_at: 'asc' },
    });
    return NextResponse.json({ count: waypoints.length, waypoints });
  } catch (error) {
    return authErrorResponse(error);
  }
}
