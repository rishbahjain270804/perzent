import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import { SessionEvents } from './SessionEvents';
import { DirectAccess } from './DirectAccess';

const QUEUE_STORAGE_KEY = 'perzent_offline_waypoints_queue_v1';
const MAX_QUEUE_SIZE = 1000;
const MAX_BATCH_SIZE = 200; // server accepts up to 500 per request
const BACKOFF_MIN_MS = 5_000;
const BACKOFF_MAX_MS = 120_000;

/** Minimal session shape this service needs (the shared-types package has no EmployeeSession type). */
export type EmployeeSession = {
  token: string;
  user_id?: string;
  id?: string;
};

export interface QueuedWaypoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  recorded_at: string;
}

export type FlushOutcome =
  | 'OK'
  | 'EMPTY'
  | 'BUSY'
  | 'RETRY_LATER'
  /** Server returned 401 - the session is invalid, caller must stop tracking. */
  | 'AUTH_INVALID'
  /** Server returned 409 NO_ACTIVE_SHIFT - the shift ended elsewhere, caller must stop tracking. */
  | 'NO_ACTIVE_SHIFT';

export interface FlushResult {
  outcome: FlushOutcome;
  sent: number;
  dropped: number;
}

export class WaypointQueueService {
  private static memory: QueuedWaypoint[] | null = null;
  private static isFlushing = false;
  private static backoffMs = 0;
  private static nextAttemptAt = 0;

  private static async ensureLoaded(): Promise<QueuedWaypoint[]> {
    if (this.memory) return this.memory;
    try {
      const data = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      const parsed = data ? JSON.parse(data) : [];
      this.memory = Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE_SIZE) : [];
    } catch {
      this.memory = [];
    }
    return this.memory;
  }

  private static persistTimer: ReturnType<typeof setTimeout> | null = null;

  private static async persist(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.memory ?? []));
    } catch (error) {
      console.warn('WaypointQueue: persist failed', error);
    }
  }

  /** Coalesces writes: one GPS fix every few seconds must not rewrite a 100 KB queue each time. */
  private static persistSoon(delayMs = 5_000) {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persist();
    }, delayMs);
  }

  static async getQueue(): Promise<QueuedWaypoint[]> {
    return [...(await this.ensureLoaded())];
  }

  static async enqueue(point: QueuedWaypoint): Promise<void> {
    const queue = await this.ensureLoaded();
    queue.push(point);
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.splice(0, queue.length - MAX_QUEUE_SIZE);
    }
    this.persistSoon();
  }

  /** Transient 4xx statuses that must be retried, not treated as a malformed batch. */
  private static isRetryableClientError(status: number) {
    return status === 408 || status === 425 || status === 429;
  }

  private static scheduleBackoff() {
    const base = Math.min(BACKOFF_MAX_MS, Math.max(BACKOFF_MIN_MS, this.backoffMs * 2));
    // ±20 % jitter so a fleet recovering from an outage does not retry in lockstep.
    this.backoffMs = base;
    this.nextAttemptAt = Date.now() + Math.round(base * (0.8 + Math.random() * 0.4));
  }

  private static resetBackoff() {
    this.backoffMs = 0;
    this.nextAttemptAt = 0;
  }

  /**
   * Flushes queued waypoints in batches until the queue is empty or a request fails.
   * `force` ignores the retry backoff (used on check-out so nothing is left behind).
   */
  static async flushQueue(session: EmployeeSession, options: { force?: boolean } = {}): Promise<FlushResult> {
    if (this.isFlushing) return { outcome: 'BUSY', sent: 0, dropped: 0 };
    if (!options.force && Date.now() < this.nextAttemptAt) {
      return { outcome: 'RETRY_LATER', sent: 0, dropped: 0 };
    }
    if (!session?.token) return { outcome: 'AUTH_INVALID', sent: 0, dropped: 0 };

    this.isFlushing = true;
    let sent = 0;
    let dropped = 0;
    try {
      const queue = await this.ensureLoaded();
      // Points enqueued while a request is in flight land at the end, so removing
      // the first `batch.length` entries after success is always the sent batch.
      while (queue.length > 0) {
        const batch = queue.slice(0, MAX_BATCH_SIZE);

        // Preferred path: database-direct RPC (no API function invocation). Falls through to the API
        // route when the backend has not issued a direct-access token.
        const direct = await DirectAccess.rpc<{ code?: string; ingested?: number }>(session, 'ingest_waypoints', {
          p_points: { waypoints: batch },
        });
        if (direct) {
          if (direct.ok) {
            if (direct.data?.code === 'NO_ACTIVE_SHIFT') {
              dropped += queue.length;
              queue.splice(0, queue.length);
              await this.persist();
              return { outcome: 'NO_ACTIVE_SHIFT', sent, dropped };
            }
            queue.splice(0, batch.length);
            sent += batch.length;
            await this.persist();
            this.resetBackoff();
            continue;
          }
          if (direct.status === 401 || direct.status === 403) {
            // Keep the points: a refreshed token or re-login will send them. Only stop flushing.
            this.scheduleBackoff();
            return { outcome: 'AUTH_INVALID', sent, dropped };
          }
          if (this.isRetryableClientError(direct.status)) {
            this.scheduleBackoff();
            return { outcome: 'RETRY_LATER', sent, dropped };
          }
          if (direct.status >= 400 && direct.status < 500) {
            queue.splice(0, batch.length);
            dropped += batch.length;
            await this.persist();
            continue;
          }
          this.scheduleBackoff();
          return { outcome: 'RETRY_LATER', sent, dropped };
        }

        let response: Response;
        try {
          response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WAYPOINTS}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({ waypoints: batch }),
          });
        } catch {
          this.scheduleBackoff();
          return { outcome: 'RETRY_LATER', sent, dropped };
        }

        if (response.ok) {
          queue.splice(0, batch.length);
          sent += batch.length;
          await this.persist();
          this.resetBackoff();
          continue;
        }

        if (response.status === 401) {
          // Session expired mid-shift: the points are still valid after re-login, so keep them.
          this.scheduleBackoff();
          SessionEvents.emitUnauthorized();
          return { outcome: 'AUTH_INVALID', sent, dropped };
        }
        if (this.isRetryableClientError(response.status)) {
          this.scheduleBackoff();
          return { outcome: 'RETRY_LATER', sent, dropped };
        }
        if (response.status === 409) {
          // Shift ended elsewhere; these points can never be accepted.
          dropped += queue.length;
          queue.splice(0, queue.length);
          await this.persist();
          return { outcome: 'NO_ACTIVE_SHIFT', sent, dropped };
        }
        if (response.status >= 400 && response.status < 500) {
          // Malformed batch - drop it, never retry.
          queue.splice(0, batch.length);
          dropped += batch.length;
          await this.persist();
          continue;
        }

        // 5xx: keep and retry later with backoff.
        this.scheduleBackoff();
        return { outcome: 'RETRY_LATER', sent, dropped };
      }
      return { outcome: sent > 0 ? 'OK' : 'EMPTY', sent, dropped };
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Records a position and attempts an immediate sync with the server.
   */
  static async recordPosition(
    session: EmployeeSession,
    pos: { latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number }
  ): Promise<FlushResult> {
    await this.enqueue({
      latitude: pos.latitude,
      longitude: pos.longitude,
      accuracy: pos.accuracy ?? 10,
      speed: pos.speed ?? 0,
      heading: pos.heading ?? 0,
      recorded_at: new Date().toISOString(),
    });
    return this.flushQueue(session);
  }

  /**
   * Clears the queue upon shift completion / checkout.
   */
  static async clear(): Promise<void> {
    this.memory = [];
    this.resetBackoff();
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      // Graceful cleanup
    }
  }
}
