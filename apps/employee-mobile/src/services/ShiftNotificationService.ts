import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export class ShiftNotificationService {
  private static notificationId: string | null = null;
  private static channelInitialized = false;
  private static lastUpdateSecond = 0;

  static async init() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('shift-tracking', {
          name: 'Active Shift Duty',
          importance: Notifications.AndroidImportance.LOW,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#16A34A',
          showBadge: true,
        });
      }
      this.channelInitialized = true;
    } catch {
      // Fallback
    }
  }

  /**
   * Updates the ongoing persistent notification with live timer and GPS status
   */
  static async updateLiveNotification(durationText: string, status: 'CHECKED_IN' | 'ON_BREAK') {
    try {
      if (!this.channelInitialized) {
        await this.init();
      }

      // Throttle notification re-schedules to once every 2 seconds to keep CPU low
      const now = Math.floor(Date.now() / 1000);
      if (now - this.lastUpdateSecond < 1 && this.notificationId) {
        return;
      }
      this.lastUpdateSecond = now;

      const title = status === 'CHECKED_IN' ? '🟢 Perzent Workforce • On Duty' : '☕ Perzent Workforce • On Break';
      const body = status === 'CHECKED_IN'
        ? `⏱️ Shift Duration: ${durationText} • Live GPS Active`
        : `⏱️ Break Duration: ${durationText} • Shift Paused`;

      this.notificationId = await Notifications.scheduleNotificationAsync({
        identifier: 'perzent-shift-active-ongoing',
        content: {
          title,
          body,
          sticky: true,
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.LOW,
          sound: false,
          data: { type: 'SHIFT_TRACKING' },
        },
        trigger: null,
      });
    } catch {
      // Silent error handler
    }
  }

  /**
   * Dismisses and cancels the sticky notification when employee checks out
   */
  static async dismiss() {
    try {
      if (this.notificationId) {
        await Notifications.dismissNotificationAsync(this.notificationId).catch(() => null);
        this.notificationId = null;
      }
      await Notifications.dismissNotificationAsync('perzent-shift-active-ongoing').catch(() => null);
      await Notifications.cancelAllScheduledNotificationsAsync().catch(() => null);
    } catch {
      // Silent cleanup
    }
  }
}
