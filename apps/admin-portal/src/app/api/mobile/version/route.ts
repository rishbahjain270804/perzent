import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  let latestVersion = '1.1.4';
  let latestVersionCode = 7;

  try {
    const candidatePaths = [
      path.join(process.cwd(), '..', 'employee-mobile', 'app.json'),
      path.join(process.cwd(), 'apps', 'employee-mobile', 'app.json'),
    ];

    for (const appJsonPath of candidatePaths) {
      if (fs.existsSync(appJsonPath)) {
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        if (appJson.expo?.version) latestVersion = appJson.expo.version;
        if (appJson.expo?.android?.versionCode) latestVersionCode = appJson.expo.android.versionCode;
        break;
      }
    }
  } catch {
    // Graceful fallback
  }

  const version = process.env.LATEST_APP_VERSION || latestVersion;
  const versionCode = parseInt(process.env.LATEST_APP_VERSION_CODE || String(latestVersionCode), 10);
  const minRequiredVersion = process.env.MIN_APP_VERSION || '1.0.0';
  const apkDownloadUrl = process.env.EMPLOYEE_APK_URL || 'https://perzent.vercel.app/api/download/apk';

  return NextResponse.json({
    latest_version: version,
    latest_version_code: versionCode,
    min_required_version: minRequiredVersion,
    download_url: apkDownloadUrl,
    force_update: true,
    release_notes: `v${version}: 15-second high-frequency GPS tracking, sticky foreground timer notification & manager tools.`,
    updated_at: new Date().toISOString(),
  });
}
