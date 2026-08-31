import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { RemoteConfigService } from './RemoteConfigService';

/**
 * Local reminder notifications (no server involved):
 *  - "Still working?" shortly before the company's auto check-out time while a shift is open.
 *  - "Break ending soon" shortly before the maximum break runs out.
 * Every reminder is rescheduled from the current server state, so nothing fires after check-out.
 */
const CHANNEL_ID = 'perzent_reminders_v1';
const KIND_KEY = 'perzent_reminder';
type Kind = 'AUTO_CHECKOUT' | 'BREAK_ENDING';

let handlerInstalled = false;

function ensureHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Shift reminders',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Reminders before auto check-out and when a break is about to end.',
    }).catch(() => undefined);
  }
}

/** Minutes offset of `timeZone` from UTC at `at` (positive east of UTC). */
function offsetMinutes(timeZone: string, at: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return Math.round((asUtc - at.getTime()) / 60_000);
  } catch {
    return -new Date().getTimezoneOffset();
  }
}

/** Next instant at which the wall clock in `timeZone` reads `HH:mm` (today if still ahead, else tomorrow). */
export function nextOccurrenceInTimeZone(hhmm: string, timeZone: string, now = new Date()): Date | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const offset = offsetMinutes(timeZone, now);
  const local = new Date(now.getTime() + offset * 60_000);
  const candidate = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), Number(m[1]), Number(m[2]), 0) - offset * 60_000;
  const when = candidate > now.getTime() ? candidate : candidate + 86_400_000;
  return new Date(when);
}

async function cancelKind(kind: Kind) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => (n.content.data as any)?.[KIND_KEY] === kind)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // Reminders are best-effort.
  }
}

async function schedule(kind: Kind, at: Date, title: string, body: string) {
  ensureHandler();
  await cancelKind(kind);
  if (at.getTime() - Date.now() < 30_000) return; // too close or already past: nothing to remind about
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { [KIND_KEY]: kind }, sound: 'default', ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  } catch {
    // Missing notification permission or scheduling failure: the on-duty notification still exists.
  }
}

export class ReminderService {
  /** Call whenever the shift state is (re)synced. Idempotent. */
  static async sync(state: {
    status: 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT';
    autoCheckoutTime: string;
    timezone: string;
    maxBreakMinutes: number;
    breakStartedAt: string | null;
  }): Promise<void> {
    const cfg = RemoteConfigService.config;
    if (!cfg.features.reminders) {
      await this.cancelAll();
      return;
    }
    if (state.status === 'CHECKED_OUT') {
      await this.cancelAll();
      return;
    }
    const beforeAuto = cfg.reminders.before_auto_checkout_minutes;
    const autoAt = nextOccurrenceInTimeZone(state.autoCheckoutTime, state.timezone);
    if (autoAt) {
      await schedule(
        'AUTO_CHECKOUT',
        new Date(autoAt.getTime() - beforeAuto * 60_000),
        'Still working?',
        `Your shift closes automatically at ${state.autoCheckoutTime}. Check out now if you are done.`
      );
    }
    if (state.status === 'ON_BREAK' && state.breakStartedAt) {
      const started = new Date(state.breakStartedAt).getTime();
      const endsAt = started + state.maxBreakMinutes * 60_000;
      await schedule(
        'BREAK_ENDING',
        new Date(endsAt - cfg.reminders.break_ending_minutes * 60_000),
        'Break ending soon',
        `Your break reaches the ${state.maxBreakMinutes}-minute limit in ${cfg.reminders.break_ending_minutes} minutes. Tap Resume shift when you are back.`
      );
    } else {
      await cancelKind('BREAK_ENDING');
    }
  }

  static async cancelAll(): Promise<void> {
    await cancelKind('AUTO_CHECKOUT');
    await cancelKind('BREAK_ENDING');
  }
}
