/**
 * 2D Extended Kalman Filter for Location Smoothing & Noise Damping
 */

export interface KalmanState {
  lat: number;
  lng: number;
  variance: number; // Error covariance (meters squared)
  lastTimestampMs: number;
}

export class LocationKalmanFilter {
  private decayVariance: number; // Process noise per millisecond
  private minAccuracy: number;

  constructor(processNoiseMetersPerSec: number = 3, minAccuracyMeters: number = 1) {
    this.decayVariance = (processNoiseMetersPerSec * processNoiseMetersPerSec) / 1000;
    this.minAccuracy = minAccuracyMeters;
  }

  /**
   * Initializes or updates Kalman filter state with a new GPS reading
   */
  public update(
    previousState: KalmanState | null,
    newLat: number,
    newLng: number,
    accuracyMeters: number,
    timestampMs: number
  ): { state: KalmanState; filteredLat: number; filteredLng: number } {
    const accuracy = Math.max(accuracyMeters, this.minAccuracy);
    const measurementVariance = accuracy * accuracy;

    if (!previousState) {
      // First fix initialization
      const initialState: KalmanState = {
        lat: newLat,
        lng: newLng,
        variance: measurementVariance,
        lastTimestampMs: timestampMs,
      };
      return {
        state: initialState,
        filteredLat: newLat,
        filteredLng: newLng,
      };
    }

    // Time elapsed in milliseconds
    const dtMs = Math.max(1, timestampMs - previousState.lastTimestampMs);

    // Predict step: variance increases over time due to motion uncertainty
    const predictedVariance = previousState.variance + dtMs * this.decayVariance;

    // Kalman gain: K = P_pred / (P_pred + R)
    const kalmanGain = predictedVariance / (predictedVariance + measurementVariance);

    // Update state
    const filteredLat = previousState.lat + kalmanGain * (newLat - previousState.lat);
    const filteredLng = previousState.lng + kalmanGain * (newLng - previousState.lng);
    const updatedVariance = (1 - kalmanGain) * predictedVariance;

    const newState: KalmanState = {
      lat: filteredLat,
      lng: filteredLng,
      variance: updatedVariance,
      lastTimestampMs: timestampMs,
    };

    return {
      state: newState,
      filteredLat,
      filteredLng,
    };
  }
}
