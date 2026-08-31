import { prisma } from '@perzent/database';
import { calculateTrailDistanceMeters, detectStops } from '@perzent/location-engine';
import { SYSTEM_CONFIG, type DailyRoutePlayback } from '@perzent/shared-types';

/**
 * Compact route storage.
 *
 * A raw LocationWaypoint row costs ~340 bytes with indexes. A closed shift is compacted into one
 * RouteArchive row: coordinates as a Google encoded polyline (precision 1e-6, ~2–4 bytes/point) and
 * timestamps as base64 varint second-deltas (~1–2 bytes/point). Speeds/headings/accuracy are not
 * archived — they only matter live. Dwell stops and break intervals are computed once and stored.
 */

const PRECISION = 1e6;

function encodeSigned(value: number, out: string[]) {
  let v = value < 0 ? ~(value << 1) : value << 1;
  while (v >= 0x20) {
    out.push(String.fromCharCode((0x20 | (v & 0x1f)) + 63));
    v >>= 5;
  }
  out.push(String.fromCharCode(v + 63));
}

export function encodePolyline(points: Array<{ latitude: number; longitude: number }>): string {
  const out: string[] = [];
  let lastLat = 0;
  let lastLng = 0;
  for (const p of points) {
    const lat = Math.round(p.latitude * PRECISION);
    const lng = Math.round(p.longitude * PRECISION);
    encodeSigned(lat - lastLat, out);
    encodeSigned(lng - lastLng, out);
    lastLat = lat;
    lastLng = lng;
  }
  return out.join('');
}

export function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const read = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += read();
    lng += read();
    points.push({ latitude: lat / PRECISION, longitude: lng / PRECISION });
  }
  return points;
}

/** Unsigned varint deltas (seconds) between consecutive timestamps, base64-encoded. */
export function encodeTimes(times: Date[]): string {
  const bytes: number[] = [];
  let last = times.length ? Math.floor(times[0].getTime() / 1000) : 0;
  for (let i = 1; i < times.length; i += 1) {
    const t = Math.floor(times[i].getTime() / 1000);
    let delta = Math.max(0, t - last);
    last = t;
    while (delta >= 0x80) {
      bytes.push((delta & 0x7f) | 0x80);
      delta >>>= 7;
    }
    bytes.push(delta);
  }
  return Buffer.from(bytes).toString('base64');
}

export function decodeTimes(firstAt: Date, encoded: string, count: number): Date[] {
  const bytes = Buffer.from(encoded, 'base64');
  const times: Date[] = [firstAt];
  let cursor = 0;
  let last = Math.floor(firstAt.getTime() / 1000);
  while (times.length < count && cursor < bytes.length) {
    let delta = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = bytes[cursor++];
      delta |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80 && cursor < bytes.length);
    last += delta;
    times.push(new Date(last * 1000));
  }
  return times;
}

type ArchiveRow = {
  attendance_id: string;
  user_id: string;
  work_date: Date;
  point_count: number;
  distance_m: number;
  first_at: Date;
  last_at: Date;
  encoded_points: string;
  encoded_times: string;
  stops: unknown;
  breaks: unknown;
};

/** Rebuilds the playback shape served by /api/routes from an archive row. */
export function playbackFromArchive(archive: ArchiveRow, user: { id: string; full_name: string }, dateStr: string): DailyRoutePlayback {
  const coords = decodePolyline(archive.encoded_points);
  const times = decodeTimes(archive.first_at, archive.encoded_times, coords.length);
  return {
    user_id: user.id,
    user_name: user.full_name,
    date: dateStr,
    total_distance_km: Number((archive.distance_m / 1000).toFixed(2)),
    stops: (archive.stops as DailyRoutePlayback['stops']) || [],
    waypoints: coords.map((c, i) => ({
      id: `${archive.attendance_id}-${i}`,
      latitude: c.latitude,
      longitude: c.longitude,
      speed: 0,
      heading: 0,
      accuracy: 0,
      recorded_at: (times[i] || archive.last_at).toISOString(),
    })),
    break_intervals: (archive.breaks as DailyRoutePlayback['break_intervals']) || [],
  };
}

/**
 * Compacts closed shifts whose raw points are at least `minAgeHours` old into RouteArchive rows and
 * deletes the raw rows. Safe to re-run; processes up to `limit` shifts per call (cron budget).
 */
export async function compactClosedShifts(options: { minAgeHours?: number; limit?: number; timeBudgetMs?: number } = {}) {
  const minAge = new Date(Date.now() - (options.minAgeHours ?? 3) * 3600e3);
  const limit = options.limit ?? 200;
  // Time-boxed rather than count-boxed: the daily cron has a 60 s budget, and an unfinished backlog
  // simply carries over — but it must never be allowed to grow faster than it is drained (see purge).
  const stopAt = Date.now() + (options.timeBudgetMs ?? 45_000);
  let compacted = 0;
  let pointsRemoved = 0;
  let timedOut = false;

  const candidates = await prisma.attendanceRecord.findMany({
    where: {
      status: { in: ['CHECKED_OUT', 'AUTO_CHECKED_OUT'] },
      punch_out_time: { lt: minAge },
      route_archive: null,
      waypoints: { some: {} },
    },
    select: { id: true, user_id: true, work_date: true, user: { select: { company_id: true } } },
    orderBy: { punch_out_time: 'asc' },
    take: limit,
  });

  for (const record of candidates) {
    if (Date.now() > stopAt) {
      timedOut = true;
      break;
    }
    const [points, breaks] = await Promise.all([
      prisma.locationWaypoint.findMany({
        where: { attendance_id: record.id },
        orderBy: { recorded_at: 'asc' },
        select: { latitude: true, longitude: true, accuracy: true, speed: true, recorded_at: true },
      }),
      prisma.attendanceBreak.findMany({ where: { attendance_id: record.id }, orderBy: { start_time: 'asc' } }),
    ]);
    if (points.length === 0) continue;

    const clean = points.filter((p) => p.accuracy <= SYSTEM_CONFIG.MAX_ACCEPTED_ACCURACY_METERS);
    const trail = clean.length > 0 ? clean : points;
    const stops = detectStops(trail, {
      radiusMeters: SYSTEM_CONFIG.STATIONARY_RADIUS_METERS,
      minDurationSeconds: SYSTEM_CONFIG.MIN_STOP_DURATION_SECONDS,
    }).map((stop, index) => ({
      id: `stop-${index + 1}`,
      address_name: `Stop ${index + 1} · ${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}`,
      latitude: stop.latitude,
      longitude: stop.longitude,
      start_time: stop.start_time.toISOString(),
      end_time: stop.end_time.toISOString(),
      duration_minutes: Math.round(stop.duration_seconds / 60),
    }));

    await prisma.$transaction([
      prisma.routeArchive.create({
        data: {
          attendance_id: record.id,
          user_id: record.user_id,
          company_id: record.user.company_id,
          work_date: record.work_date,
          point_count: trail.length,
          distance_m: Math.round(calculateTrailDistanceMeters(trail)),
          first_at: trail[0].recorded_at,
          last_at: trail[trail.length - 1].recorded_at,
          encoded_points: encodePolyline(trail),
          encoded_times: encodeTimes(trail.map((p) => p.recorded_at)),
          stops,
          breaks: breaks.map((b) => ({
            start_time: b.start_time.toISOString(),
            end_time: (b.end_time ?? b.start_time).toISOString(),
            duration_minutes: b.duration_minutes,
          })),
        },
      }),
      prisma.locationWaypoint.deleteMany({ where: { attendance_id: record.id } }),
    ]);
    compacted += 1;
    pointsRemoved += points.length;
  }

  return { compacted, points_removed: pointsRemoved, remaining: timedOut || candidates.length === limit };
}
