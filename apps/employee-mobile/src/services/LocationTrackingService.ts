export class LocationTrackingService {
  private static isTrackingActive: boolean = false;
  private static trackingTimer: any = null;

  public static startTracking(): void {
    this.isTrackingActive = true;
    console.log('[PERZENT ENGINE] 2-Minute Background GPS Tracking Started.');
  }

  public static pauseTracking(): void {
    this.isTrackingActive = false;
    console.log('[PERZENT ENGINE] Tracking Paused (Lunch Break Active).');
  }

  public static resumeTracking(): void {
    this.isTrackingActive = true;
    console.log('[PERZENT ENGINE] Tracking Resumed after Lunch Break.');
  }

  public static stopTracking(): void {
    this.isTrackingActive = false;
    if (this.trackingTimer) clearInterval(this.trackingTimer);
    console.log('[PERZENT ENGINE] Tracking Terminated.');
  }
}
