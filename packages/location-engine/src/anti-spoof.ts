import { calculateHaversineDistance, Coordinates } from './distance';

export interface SpoofCheckResult {
  isSuspicious: boolean;
  reason?: string;
  calculatedSpeedKmh?: number;
}

/**
 * Validates GPS coordinate integrity against mock apps, teleportation and noise
 */
export function validateCoordinateIntegrity(
  current: Coordinates & { accuracy: number; timestamp: string; is_mock?: boolean },
  previous?: Coordinates & { timestamp: string } | null,
  maxRealisticSpeedKmh: number = 180,
  maxAllowedAccuracyMeters: number = 30
): SpoofCheckResult {
  // 1. Check OS Mock Provider flag
  if (current.is_mock) {
    return {
      isSuspicious: true,
      reason: 'Mock location provider detected on device',
    };
  }

  // 2. Accuracy threshold check
  if (current.accuracy > maxAllowedAccuracyMeters) {
    return {
      isSuspicious: true,
      reason: `Accuracy radius too poor (${current.accuracy}m > ${maxAllowedAccuracyMeters}m)`,
    };
  }

  // 3. Teleportation / Impossible Speed Check
  if (previous) {
    const distMeters = calculateHaversineDistance(previous, current);
    const dtSeconds = Math.max(
      1,
      (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000
    );
    const speedKmh = (distMeters / dtSeconds) * 3.6;

    if (speedKmh > maxRealisticSpeedKmh) {
      return {
        isSuspicious: true,
        reason: `Impossible travel speed detected (${Math.round(speedKmh)} km/h > ${maxRealisticSpeedKmh} km/h)`,
        calculatedSpeedKmh: speedKmh,
      };
    }

    return {
      isSuspicious: false,
      calculatedSpeedKmh: speedKmh,
    };
  }

  return { isSuspicious: false, calculatedSpeedKmh: 0 };
}
