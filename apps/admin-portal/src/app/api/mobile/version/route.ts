import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const latestVersion = process.env.LATEST_APP_VERSION || '1.1.1';
  const latestVersionCode = parseInt(process.env.LATEST_APP_VERSION_CODE || '3', 10);
  const minRequiredVersion = process.env.MIN_APP_VERSION || '1.0.0';
  const apkDownloadUrl = process.env.EMPLOYEE_APK_URL || 'https://perzent.vercel.app/api/download/apk';

  return NextResponse.json({
    latest_version: latestVersion,
    latest_version_code: latestVersionCode,
    min_required_version: minRequiredVersion,
    download_url: apkDownloadUrl,
    force_update: true,
    release_notes: 'Automated workforce location tracking & Always Allow permission enforcement.',
    updated_at: new Date().toISOString(),
  });
}
