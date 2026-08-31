import { runtime } from './runtime';

/** Built-in default; EXPO_PUBLIC_API_URL is inlined at bundle time by Expo. */
export const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://perzent.jspcoders.app';

export const API_CONFIG = {
  /**
   * Live base URL for every request. Remote config (`api_base_url`) can move the backend without an
   * app release; until a config has been fetched (or when it is unset) this is the built-in default.
   */
  get BASE_URL(): string {
    return runtime.apiBaseUrl || DEFAULT_API_BASE_URL;
  },
  DOMAINS: {
    API_BACKEND: 'https://perzent.jspcoders.app',
    EMPLOYEE_APP: 'https://perzent.jspcoders.app',
    OWNER_ADMIN: 'https://perzent.jspcoders.app/dashboard',
  },
  ENDPOINTS: {
    AUTH_LOGIN: '/api/auth',
    EMPLOYEES: '/api/employees',
    ATTENDANCE: '/api/attendance',
    LIVE_TEAM: '/api/live-team',
    ROUTES: '/api/routes',
    PAYMENTS_CREATE: '/api/payments/create-order',
    PAYMENTS_VERIFY: '/api/payments/verify',
    PAYMENTS_TRANSACTIONS: '/api/payments/transactions',
    MOBILE_ATTENDANCE: '/api/mobile/attendance',
    ATTENDANCE_HISTORY: '/api/mobile/attendance/history',
    WAYPOINTS: '/api/mobile/waypoints',
    VERSION: '/api/mobile/version',
  },
};
