export const SYSTEM_CONFIG = {
  // Timezone & Cutoffs
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  AUTO_CHECKOUT_TIME_IST: '23:40',
  MAX_LUNCH_BREAK_MINUTES: 30,

  // Retention Policies (Free Tier)
  ROUTE_HISTORY_RETENTION_DAYS: 15,
  ATTENDANCE_RETENTION_DAYS: 45,

  // Precision Tracking Engine Parameters
  TRACKING_INTERVAL_MS: 120000,          // 2 minutes (default)
  WALKING_INTERVAL_MS: 60000,            // 1 minute when walking
  VEHICLE_INTERVAL_MS: 30000,            // 30 seconds in vehicle
  HEADING_CHANGE_TRIGGER_DEG: 30,        // Corner turn detection
  MAX_ALLOWED_ACCURACY_METERS: 30,       // Discard noisy fixes > 30m
  STATIONARY_RADIUS_METERS: 20,          // Movement < 20m treated as stationary
  STATIONARY_SPEED_THRESHOLD_MS: 0.8,    // < 0.8 m/s (~2.8 km/h) = stationary
  MIN_STOP_DURATION_SECONDS: 300,        // 5 mins dwell time to form a Stop Pin

  // Anti-Spoofing & Safety
  MAX_REALISTIC_SPEED_KMH: 180,
  ALLOW_MOCK_LOCATIONS: false,
} as const;
