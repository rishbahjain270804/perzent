import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const latestVersion = process.env.LATEST_APP_VERSION || '1.1.2';
  const latestVersionCode = parseInt(process.env.LATEST_APP_VERSION_CODE || '4', 10);
  const minRequiredVersion = process.env.MIN_APP_VERSION || '1.0.0';
  const apkDownloadUrl = process.env.EMPLOYEE_APK_URL || 'https://perzent.vercel.app/api/download/apk';

  return NextResponse.json({
    latest_version: latestVersion,
    latest_version_code: latestVersionCode,
    min_required_version: minRequiredVersion,
    download_url: apkDownloadUrl,
    force_update: true,
    release_notes: 'v1.1.2: 15-second high-frequency GPS tracking, persistent on-duty notification timer & manager tools.',
    updated_at: new Date().toISOString(),
  });
}
