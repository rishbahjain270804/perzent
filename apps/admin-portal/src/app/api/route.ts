import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    service: 'Perzent Workforce Intelligence & Hardware Telemetry Backend API',
    status: 'ONLINE_HEALTHY',
    version: '1.0.0',
    deployment: {
      gateway_provider: 'Vercel / Cloudflare Edge Proxy',
      api_domain: 'https://api.perzent.jspcoders.codes',
      employee_app_domain: 'https://perzent.jspcoders.app',
      owner_admin_route: 'https://perzent.jspcoders.codes/owner-admin',
    },
    features: {
      gps_tracking: 'GPS-stamped attendance; background route capture pending',
      hardware_telemetry: 'Schema ready; native collection pending',
      payment_gateway: 'Cashfree PG v3 (₹99 + 18% GST = ₹116.82/seat)',
      anti_tamper: 'Hardware UUID Single Device Lock',
      policy_auto_checkout: 'Configurable; scheduler pending',
    },
    endpoints: {
      live_team: '/api/live-team',
      employees: '/api/employees',
      attendance: '/api/attendance',
      routes: '/api/routes',
      payments_create: '/api/payments/create-order',
      payments_verify: '/api/payments/verify',
      payments_transactions: '/api/payments/transactions',
      payments_webhook: '/api/payments/webhook',
      auth: '/api/auth',
    },
    timestamp: new Date().toISOString(),
  });
}
