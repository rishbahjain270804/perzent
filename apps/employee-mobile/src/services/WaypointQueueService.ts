import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmployeeSession } from '@perzent/shared-types';
import { API_CONFIG } from '../config/api';

const QUEUE_STORAGE_KEY = 'perzent_offline_waypoints_queue_v1';
const MAX_QUEUE_SIZE = 1000;

export interface QueuedWaypoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  recorded_at: string;
}

export class WaypointQueueService {
  private static isFlushing = false;

  /**
   * Retrieves all offline queued waypoints from local storage
   */
  static async getQueue(): Promise<QueuedWaypoint[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Enqueues a new waypoint into persistent local storage
   */
  static async enqueue(point: QueuedWaypoint): Promise<void> {
    try {
      const queue = await this.getQueue();
      queue.push(point);
      // Keep only recent MAX_QUEUE_SIZE points
      const trimmed = queue.slice(-MAX_QUEUE_SIZE);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Flushes all queued waypoints to the backend in a batch
   */
  static async flushQueue(session: EmployeeSession): Promise<number> {
    if (this.isFlushing) return 0;
    this.isFlushing = true;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        return 0;
      }

      // Send up to 100 points in one batch
      const batch = queue.slice(0, 100);

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WAYPOINTS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ waypoints: batch }),
      });

      if (!response.ok) {
        return 0;
      }

      // Remove successfully flushed batch from storage
      const remaining = queue.slice(batch.length);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));

      // If there are more items remaining, recursively flush remaining in next tick
      if (remaining.length > 0) {
        setTimeout(() => this.flushQueue(session), 500);
      }

      return batch.length;
    } catch {
      // Network still unavailable, keep items in queue
      return 0;
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Records a position and attempts immediate sync with server
   */
  static async recordPosition(
    session: EmployeeSession,
    pos: { latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number }
  ): Promise<void> {
    const point: QueuedWaypoint = {
      latitude: pos.latitude,
      longitude: pos.longitude,
      accuracy: pos.accuracy || 10,
      speed: pos.speed || 0,
      heading: pos.heading || 0,
      recorded_at: new Date().toISOString(),
    };

    await this.enqueue(point);
    await this.flushQueue(session);
  }

  /**
   * Clears the queue upon shift completion / checkout
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      // Graceful cleanup
    }
  }
}
