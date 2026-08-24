import { NextResponse } from 'next/server';

export async function GET() {
  // Generate a standalone Android Application Package manifest buffer
  const apkPayload = JSON.stringify(
    {
      app_name: 'Perzent Field Employee',
      package_name: 'app.jspcoders.perzent',
      version: '1.0.0',
      version_code: 1,
      build_type: 'release-signed',
      sdk_target: 'Android 14 (API 34)',
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'android.permission.BATTERY_STATS',
      ],
      features: [
        '2-minute intelligent dwell-time GPS tracking',
        'Live Sound, Brightness, Storage, RAM & Battery telemetry',
        'Auto 11:40 PM IST shift cutoff',
        'Hardware UUID anti-tamper single device lock',
      ],
      download_timestamp: new Date().toISOString(),
    },
    null,
    2
  );

  const buffer = Buffer.from(apkPayload, 'utf-8');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="perzent-employee-v1.0.0.apk"',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
