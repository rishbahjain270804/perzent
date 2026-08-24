import { calculateHaversineDistance, Coordinates } from './distance';
import { LocationPingDto, RouteTimelineStop, RouteTimelineWaypoint } from '@perzent/shared-types';

export interface DwellStopAccumulator {
  activeStop: {
    start_time: string;
    end_time: string;
    center_lat: number;
    center_lng: number;
    ping_count: number;
    weights_sum: number;
    address_name?: string;
  } | null;
  completedStops: RouteTimelineStop[];
  waypoints: RouteTimelineWaypoint[];
  lastLocation: (Coordinates & { timestamp: string }) | null;
}

/**
 * Intelligent Dwell-Time & Route Aggregator
 * Converts raw periodic GPS pings into distinct Stops (Dwell periods) and Waypoints
 */
export class LocationStreamAggregator {
  private stationaryRadiusMeters: number;
  private minStopDurationSec: number;

  constructor(stationaryRadiusMeters: number = 20, minStopDurationSec: number = 300) {
    this.stationaryRadiusMeters = stationaryRadiusMeters;
    this.minStopDurationSec = minStopDurationSec;
  }

  public processPing(
    accumulator: DwellStopAccumulator,
    ping: LocationPingDto
  ): DwellStopAccumulator {
    const currentCoord: Coordinates = { latitude: ping.latitude, longitude: ping.longitude };
    const pingWeight = 1 / Math.max(1, ping.accuracy * ping.accuracy);

    // Initial first point
    if (!accumulator.lastLocation) {
      accumulator.lastLocation = { ...currentCoord, timestamp: ping.timestamp };
      accumulator.activeStop = {
        start_time: ping.timestamp,
        end_time: ping.timestamp,
        center_lat: ping.latitude,
        center_lng: ping.longitude,
        ping_count: 1,
        weights_sum: pingWeight,
        address_name: 'Work Location',
      };
      return accumulator;
    }

    const distFromLast = calculateHaversineDistance(accumulator.lastLocation, currentCoord);
    const isStationary = distFromLast < this.stationaryRadiusMeters && (ping.speed ?? 0) < 0.8;

    if (isStationary) {
      // Extend or create active stop
      if (accumulator.activeStop) {
        // Weighted centroid calculation
        const newWeightSum = accumulator.activeStop.weights_sum + pingWeight;
        const newCenterLat =
          (accumulator.activeStop.center_lat * accumulator.activeStop.weights_sum +
            ping.latitude * pingWeight) /
          newWeightSum;
        const newCenterLng =
          (accumulator.activeStop.center_lng * accumulator.activeStop.weights_sum +
            ping.longitude * pingWeight) /
          newWeightSum;

        accumulator.activeStop.center_lat = newCenterLat;
        accumulator.activeStop.center_lng = newCenterLng;
        accumulator.activeStop.weights_sum = newWeightSum;
        accumulator.activeStop.ping_count += 1;
        accumulator.activeStop.end_time = ping.timestamp;
      } else {
        accumulator.activeStop = {
          start_time: ping.timestamp,
          end_time: ping.timestamp,
          center_lat: ping.latitude,
          center_lng: ping.longitude,
          ping_count: 1,
          weights_sum: pingWeight,
          address_name: 'Location Point',
        };
      }
    } else {
      // Employee is Moving
      // 1. If an active stop exists and met min stop duration, finalize it into completedStops
      if (accumulator.activeStop) {
        const durationSec =
          (new Date(accumulator.activeStop.end_time).getTime() -
            new Date(accumulator.activeStop.start_time).getTime()) /
          1000;

        if (durationSec >= this.minStopDurationSec) {
          accumulator.completedStops.push({
            id: `stop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            address_name: accumulator.activeStop.address_name || 'Stationary Stop',
            latitude: accumulator.activeStop.center_lat,
            longitude: accumulator.activeStop.center_lng,
            start_time: accumulator.activeStop.start_time,
            end_time: accumulator.activeStop.end_time,
            duration_minutes: Math.round(durationSec / 60),
          });
        }
        accumulator.activeStop = null;
      }

      // 2. Append route waypoint breadcrumb
      accumulator.waypoints.push({
        id: `wpt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        latitude: ping.latitude,
        longitude: ping.longitude,
        speed: ping.speed ?? 0,
        heading: ping.heading ?? 0,
        accuracy: ping.accuracy,
        recorded_at: ping.timestamp,
      });
    }

    accumulator.lastLocation = { ...currentCoord, timestamp: ping.timestamp };
    return accumulator;
  }
}
