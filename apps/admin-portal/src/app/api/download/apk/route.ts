import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const artifactUrl = process.env.EMPLOYEE_APK_URL;
  if (artifactUrl) {
    try {
      return NextResponse.redirect(new URL(artifactUrl), 307);
    } catch {
      // Fallback to internal binary serving
    }
  }

  // Attempt to read the packaged APK binary from the public directory
  try {
    const filePath = path.join(process.cwd(), 'public', 'downloads', 'perzent-employee-v1.0.0.apk');
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="perzent-employee-v1.0.0.apk"',
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch (err) {
    // If filesystem is read-only, redirect to static asset URL
  }

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/downloads/perzent-employee-v1.0.0.apk`, 307);
}
