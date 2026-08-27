import { calculateHaversineDistance } from './distance';

export interface StopInputPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number; // m/s
  recorded_at: Date | string;
}

export interface DetectedStop {
  latitude: number;
  longitude: number;
  start_time: Date;
  end_time: Date;
  duration_seconds: number;
  point_count: number;
}

export interface StopDetectionOptions {
  /** Points farther than this (metres) from the cluster centroid end the cluster. */
  radiusMeters?: number;
  /** Clusters shorter than this (seconds) are not reported as stops. */
  minDurationSeconds?: number;
  /** Points with worse accuracy (metres) than this are ignored. */
  maxAccuracyMeters?: number;
}

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

/**
 * Detects dwell stops from an ordered GPS trail using a simple, robust centroid clustering:
 * consecutive points that stay within `radiusMeters` of the running centroid form a cluster;
 * clusters that last at least `minDurationSeconds` are returned as stops.
 * The centroid is accuracy-weighted so noisy fixes do not drag it around.
 */
export function detectStops(points: StopInputPoint[], options: StopDetectionOptions = {}): DetectedStop[] {
  const radius = options.radiusMeters ?? 35;
  const minDuration = options.minDurationSeconds ?? 300;
  const maxAccuracy = options.maxAccuracyMeters ?? 150;

  const usable = points
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .filter((p) => !Number.isFinite(p.accuracy) || (p.accuracy as number) <= maxAccuracy)
    .map((p) => ({ ...p, at: toDate(p.recorded_at) }))
    .filter((p) => !Number.isNaN(p.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const stops: DetectedStop[] = [];
  let cluster: { latSum: number; lngSum: number; weight: number; start: Date; end: Date; count: number } | null = null;

  const centroid = (c: NonNullable<typeof cluster>) => ({ latitude: c.latSum / c.weight, longitude: c.lngSum / c.weight });
  const finalize = (c: NonNullable<typeof cluster>) => {
    const duration = Math.round((c.end.getTime() - c.start.getTime()) / 1000);
    if (duration >= minDuration) {
      const { latitude, longitude } = centroid(c);
      stops.push({ latitude, longitude, start_time: c.start, end_time: c.end, duration_seconds: duration, point_count: c.count });
    }
  };

  for (const point of usable) {
    const w = 1 / Math.max(5, point.accuracy ?? 20) ** 2;
    if (!cluster) {
      cluster = { latSum: point.latitude * w, lngSum: point.longitude * w, weight: w, start: point.at, end: point.at, count: 1 };
      continue;
    }
    const distance = calculateHaversineDistance(centroid(cluster), { latitude: point.latitude, longitude: point.longitude });
    if (distance <= radius) {
      cluster.latSum += point.latitude * w;
      cluster.lngSum += point.longitude * w;
      cluster.weight += w;
      cluster.end = point.at;
      cluster.count += 1;
    } else {
      finalize(cluster);
      cluster = { latSum: point.latitude * w, lngSum: point.longitude * w, weight: w, start: point.at, end: point.at, count: 1 };
    }
  }
  if (cluster) finalize(cluster);
  return stops;
}

/**
 * Sums the travelled distance of a trail while ignoring GPS jitter:
 * a hop only counts if it is larger than the combined accuracy radius of its two fixes.
 */
export function calculateTrailDistanceMeters(points: StopInputPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const hop = calculateHaversineDistance(
      { latitude: prev.latitude, longitude: prev.longitude },
      { latitude: curr.latitude, longitude: curr.longitude }
    );
    const noiseFloor = Math.min(60, ((prev.accuracy ?? 10) + (curr.accuracy ?? 10)) / 2);
    if (hop > noiseFloor) total += hop;
  }
  return total;
}

/**
 * Minutes the trail has been within `radiusMeters` of its most recent fix — i.e. how long the
 * employee has been dwelling at the current location. Expects points ordered oldest → newest.
 */
export function currentDwellMinutes(points: StopInputPoint[], radiusMeters = 35): number {
  if (points.length === 0) return 0;
  const latest = points[points.length - 1];
  const latestAt = toDate(latest.recorded_at).getTime();
  let earliest = latestAt;
  for (let i = points.length - 2; i >= 0; i -= 1) {
    const p = points[i];
    const d = calculateHaversineDistance(
      { latitude: latest.latitude, longitude: latest.longitude },
      { latitude: p.latitude, longitude: p.longitude }
    );
    if (d > radiusMeters) break;
    earliest = toDate(p.recorded_at).getTime();
  }
  return Math.max(0, Math.round((latestAt - earliest) / 60000));
}
