import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { calculateHaversineDistance } from '@perzent/location-engine';
import { SYSTEM_CONFIG, WaypointBatchSchema } from '@perzent/shared-types';
import { findOpenAttendance } from '@/lib/attendance';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const secondKey = (date: Date) => Math.floor(date.getTime() / 1000);

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER']);
    const raw = await request.json();
    const parsed = WaypointBatchSchema.parse(Array.isArray(raw?.waypoints) ? raw : { waypoints: [raw] });

    const attendance = await findOpenAttendance(session.userId);
    if (!attendance) {
      return jsonError('No active shift. Tracking has been stopped.', 409, 'NO_ACTIVE_SHIFT');
    }

    const now = Date.now();
    const oldest = now - SYSTEM_CONFIG.MAX_WAYPOINT_AGE_DAYS * 86400000;
    const newest = now + SYSTEM_CONFIG.MAX_WAYPOINT_FUTURE_SKEW_MS;
    const notBefore = attendance.punch_in_time.getTime() - 60_000;

    const seen = new Set<number>();
    const candidates = parsed.waypoints
      .map((point) => ({
        attendance_id: attendance.id,
        user_id: session.userId,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy ?? 50,
        speed: point.speed ?? 0,
        heading: point.heading === 360 ? 0 : point.heading ?? 0,
        recorded_at: point.recorded_at ? new Date(point.recorded_at) : new Date(),
      }))
      .filter((point) => !Number.isNaN(point.recorded_at.getTime()))
      .filter((point) => {
        const t = point.recorded_at.getTime();
        return t >= oldest && t <= newest && t >= notBefore;
      })
      .filter((point) => point.accuracy <= SYSTEM_CONFIG.MAX_ACCEPTED_ACCURACY_METERS)
      .filter((point) => {
        const key = secondKey(point.recorded_at);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.recorded_at.getTime() - b.recorded_at.getTime());

    let fresh = candidates;
    if (candidates.length > 0) {
      const [existing, lastStored] = await Promise.all([
        prisma.locationWaypoint.findMany({
          where: {
            attendance_id: attendance.id,
            recorded_at: { gte: candidates[0].recorded_at, lte: candidates[candidates.length - 1].recorded_at },
          },
          select: { recorded_at: true },
        }),
        prisma.locationWaypoint.findFirst({
          where: { attendance_id: attendance.id },
          orderBy: { recorded_at: 'desc' },
          select: { latitude: true, longitude: true, recorded_at: true },
        }),
      ]);
      const existingKeys = new Set(existing.map((row) => secondKey(row.recorded_at)));

      // Movement thinning: a point within MIN_MOVE_DISTANCE_METERS of the last stored point is not
      // movement. Keep it only as a "still here" sample once per STATIONARY_SAMPLE_INTERVAL_MS so dwell
      // time stays computable; everything else stationary is dropped (presence is tracked separately
      // via the device heartbeat). Applies to every client, including older app builds.
      let lastKept = lastStored;
      fresh = [];
      for (const point of candidates) {
        if (existingKeys.has(secondKey(point.recorded_at))) continue;
        if (lastKept) {
          const metres = calculateHaversineDistance(lastKept, point);
          const elapsed = point.recorded_at.getTime() - lastKept.recorded_at.getTime();
          if (metres < SYSTEM_CONFIG.MIN_MOVE_DISTANCE_METERS && elapsed < SYSTEM_CONFIG.STATIONARY_SAMPLE_INTERVAL_MS) continue;
        }
        fresh.push(point);
        lastKept = point;
      }
    }

    let ingested = 0;
    if (fresh.length > 0) {
      const [created] = await prisma.$transaction([
        prisma.locationWaypoint.createMany({ data: fresh, skipDuplicates: true }),
        prisma.userDevice.updateMany({ where: { user_id: session.userId, is_active: true }, data: { last_seen_at: new Date() } }),
      ]);
      ingested = created.count;
    } else {
      await prisma.userDevice.updateMany({ where: { user_id: session.userId, is_active: true }, data: { last_seen_at: new Date() } });
    }

    return NextResponse.json({
      ingested,
      dropped: parsed.waypoints.length - ingested,
      attendance_id: attendance.id,
      shift_status: attendance.status,
      server_time: new Date().toISOString(),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER']);
    const attendance = await findOpenAttendance(session.userId);
    if (!attendance) return NextResponse.json({ count: 0, waypoints: [] });
    const waypoints = await prisma.locationWaypoint.findMany({
      where: { attendance_id: attendance.id },
      orderBy: { recorded_at: 'asc' },
      select: { id: true, latitude: true, longitude: true, accuracy: true, speed: true, heading: true, recorded_at: true },
    });
    return NextResponse.json({ count: waypoints.length, waypoints });
  } catch (error) {
    return authErrorResponse(error);
  }
}
