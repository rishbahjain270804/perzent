import { NextResponse } from 'next/server';
import { versionInfo } from '@/lib/app-version';
import { getAppConfig, statusView } from '@/lib/app-config';

export const dynamic = 'force-dynamic';

/**
 * App version policy + remote status in one call (the app polls this on launch, resume and every
 * 15 minutes). Values in the AppConfig database row override the deployed defaults.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const base = versionInfo(origin);
  try {
    const config = await getAppConfig();
    const status = statusView(config);
    return NextResponse.json(
      {
        ...base,
        latest_version: config.latest_app_version || base.latest_version,
        latest_version_code: config.latest_app_version_code ?? base.latest_version_code,
        min_required_version_code: config.min_app_version_code ?? base.min_required_version_code,
        play_store_url: config.play_store_url || base.play_store_url,
        ...status,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('version endpoint: config lookup failed', error);
    return NextResponse.json(base, { headers: { 'Cache-Control': 'no-store' } });
  }
}
