import { NextResponse } from 'next/server';
import { prisma, getStore } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

/**
 * POST /api/mobile/waypoints
 *
 * Ingests background GPS waypoints from the employee mobile app.
 * Accepts a single waypoint or a batch array of waypoints.
 *
 * Body (single):
 *   { latitude, longitude, accuracy?, altitude?, speed?, heading?, recorded_at? }
 *
 * Body (batch):
 *   { waypoints: [{ latitude, longitude, accuracy?, altitude?, speed?, heading?, recorded_at? }, ...] }
 *
 * The endpoint also runs dwell detection: if the employee has been
 * within 50 m of the same spot for ≥ 2 minutes, a location stop is
 * created or extended.
 */

const DWELL_RADIUS_METERS = 50;
const DWELL_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE']);
    const body = await request.json();

    // Resolve today's attendance
    const todayStr = new Date().toISOString().slice(0, 10);
    const workDate = new Date(`${todayStr}T00:00:00.000Z`);

    const attendance = await prisma.attendanceRecord.findFirst({
      where: { user_id: session.userId, work_date: workDate },
    });

    if (!attendance || ['CHECKED_OUT', 'AUTO_CHECKED_OUT'].includes(attendance.status)) {
      return NextResponse.json({ error: 'No active attendance session' }, { status: 409 });
    }

    // Normalise input to array
    const rawPoints: any[] = body.waypoints || [body];
    const ingested: any[] = [];
    const store = getStore();

    for (const pt of rawPoints) {
      if (!Number.isFinite(pt.latitude) || !Number.isFinite(pt.longitude)) continue;

      const wp = {
        id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        attendance_id: attendance.id,
        user_id: session.userId,
        latitude: pt.latitude,
        longitude: pt.longitude,
        accuracy: pt.accuracy ?? null,
        altitude: pt.altitude ?? null,
        speed: pt.speed ?? 0,
        heading: pt.heading ?? 0,
        recorded_at: pt.recorded_at ? new Date(pt.recorded_at) : new Date(),
      };

      store.locationWaypoints.push(wp);
      ingested.push(wp);

      // ── Dwell detection ──
      // Find the most recent open stop for this user
      const openStop = store.locationStops.find(
        (s: any) => s.user_id === session.userId && !s.end_time
      );

      if (openStop) {
        const dist = haversineMeters(openStop.latitude, openStop.longitude, wp.latitude, wp.longitude);
        if (dist <= DWELL_RADIUS_METERS) {
          // Still dwelling — extend
          openStop.end_time = wp.recorded_at;
          openStop.dwell_duration_seconds = Math.round(
            (openStop.end_time.getTime() - openStop.start_time.getTime()) / 1000
          );
        } else {
          // Moved away — close the stop
          openStop.end_time = wp.recorded_at;
          openStop.dwell_duration_seconds = Math.round(
            (openStop.end_time.getTime() - openStop.start_time.getTime()) / 1000
          );
        }
      }

      // If speed ≈ 0 and no open stop, start a potential dwell
      if (wp.speed <= 1.5) {
        const recentWps = store.locationWaypoints
          .filter(
            (w: any) =>
              w.user_id === session.userId &&
              w.recorded_at.getTime() >= wp.recorded_at.getTime() - DWELL_THRESHOLD_MS
          )
          .filter((w: any) => haversineMeters(w.latitude, w.longitude, wp.latitude, wp.longitude) <= DWELL_RADIUS_METERS);

        if (recentWps.length >= 2) {
          const earliest = recentWps.reduce((a: any, b: any) =>
            a.recorded_at < b.recorded_at ? a : b
          );
          const elapsed = wp.recorded_at.getTime() - earliest.recorded_at.getTime();

          if (elapsed >= DWELL_THRESHOLD_MS) {
            // Check there's no already-open stop at this location
            const existingStop = store.locationStops.find(
              (s: any) =>
                s.user_id === session.userId &&
                !s.end_time &&
                haversineMeters(s.latitude, s.longitude, wp.latitude, wp.longitude) <= DWELL_RADIUS_METERS
            );
            if (!existingStop) {
              store.locationStops.push({
                id: `stop_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                attendance_id: attendance.id,
                user_id: session.userId,
                latitude: wp.latitude,
                longitude: wp.longitude,
                address_name: `${wp.latitude.toFixed(4)}°N, ${wp.longitude.toFixed(4)}°E`,
                start_time: earliest.recorded_at,
                end_time: null,
                dwell_duration_seconds: Math.round(elapsed / 1000),
              });
            }
          }
        }
      }
    }

    // Update device last_seen_at
    const device = store.userDevices.find(
      (d: any) => d.user_id === session.userId && d.is_active
    );
    if (device) {
      device.last_seen_at = new Date();
    }

    return NextResponse.json({
      ingested: ingested.length,
      total_waypoints: store.locationWaypoints.filter((w: any) => w.user_id === session.userId).length,
      active_stops: store.locationStops.filter(
        (s: any) => s.user_id === session.userId && !s.end_time
      ).length,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** GET /api/mobile/waypoints — return today's trail for the authenticated employee */
export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE']);
    const store = getStore();
    const waypoints = store.locationWaypoints
      .filter((w: any) => w.user_id === session.userId)
      .sort((a: any, b: any) => a.recorded_at.getTime() - b.recorded_at.getTime());

    return NextResponse.json({ count: waypoints.length, waypoints });
  } catch (error) {
    return authErrorResponse(error);
  }
}
