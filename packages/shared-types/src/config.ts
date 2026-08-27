export const SYSTEM_CONFIG = {
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  DEFAULT_AUTO_CHECKOUT_TIME: '23:40',
  DEFAULT_MAX_BREAK_MINUTES: 30,
  DEFAULT_ROUTE_RETENTION_DAYS: 15,
  DEFAULT_ATTENDANCE_RETENTION_DAYS: 45,

  // Ingestion quality gates
  MAX_ACCEPTED_ACCURACY_METERS: 150, // waypoints noisier than this are dropped
  MAX_WAYPOINT_AGE_DAYS: 7, // reject timestamps older than this
  MAX_WAYPOINT_FUTURE_SKEW_MS: 5 * 60 * 1000,
  MAX_WAYPOINTS_PER_BATCH: 500,
  /** A point closer than this to the last stored point is not movement and is not stored… */
  MIN_MOVE_DISTANCE_METERS: 10,
  /** …except one "still here" sample per interval so dwell time can still be computed. */
  STATIONARY_SAMPLE_INTERVAL_MS: 10 * 60 * 1000,

  // Live map freshness thresholds (seconds)
  LIVE_FRESH_SECONDS: 60,
  LIVE_STALE_SECONDS: 120,

  // Stop / dwell detection
  STATIONARY_RADIUS_METERS: 35,
  STATIONARY_SPEED_THRESHOLD_MS: 0.8,
  MIN_STOP_DURATION_SECONDS: 300,

  // Anti-spoofing
  MAX_REALISTIC_SPEED_KMH: 180,
  ALLOW_MOCK_LOCATIONS: false,
} as const;

/** Product / developer identity used by the app and the portal (single place to change). */
export const BRAND = {
  productName: 'Perzent',
  developerName: 'JSP Coders',
  developerUrl: 'https://jspcoders.app',
  supportEmail: 'jspcoders@gmail.com',
  webUrl: 'https://perzent.jspcoders.app',
  supportPath: '/support',
  faqPath: '/faq',
  privacyPath: '/privacy',
  termsPath: '/terms',
  accountDeletionPath: '/account-deletion',
} as const;
