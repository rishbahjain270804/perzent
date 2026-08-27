import { NextResponse } from 'next/server';
import { getAppConfig, statusView } from '@/lib/app-config';

export const dynamic = 'force-dynamic';

/** Public: maintenance / announcement / support state for the app and portal. */
export async function GET() {
  try {
    const config = await getAppConfig();
    return NextResponse.json(statusView(config), { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=30' } });
  } catch (error) {
    console.error('status endpoint failed', error);
    // Never block clients because the status lookup failed.
    return NextResponse.json(
      {
        maintenance: { enabled: false, scope: 'ALL', mobile: false, web: false, title: '', message: '', until: null },
        announcement: null,
        support: { email: null, phone: null },
        server_time: new Date().toISOString(),
        degraded: true,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
