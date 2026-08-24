/**
 * Production API & Gateway Endpoint Configuration
 * Production API Domain: https://api.perzent.jspcoders.codes
 * Employee Web App Domain: https://perzent.jspcoders.app
 * Owner Admin Route: /owner-admin (Cloudflare Live Proxy)
 */

export const API_CONFIG = {
  BASE_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.perzent.jspcoders.codes',
  DOMAINS: {
    API_BACKEND: 'https://api.perzent.jspcoders.codes',
    EMPLOYEE_APP: 'https://perzent.jspcoders.app',
    OWNER_ADMIN: 'https://perzent.jspcoders.codes/owner-admin',
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
    WAYPOINTS: '/api/mobile/waypoints',
  },
};
