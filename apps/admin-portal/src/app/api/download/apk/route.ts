import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Static file published under apps/admin-portal/public/downloads (served by the CDN). */
const LATEST_APK_FILE = 'perzent-employee-latest.apk';

function externalArtifactUrl() {
  const value = process.env.EMPLOYEE_APK_URL;
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

async function staticArtifactAvailable(request: Request) {
  try {
    const response = await fetch(new URL(`/downloads/${LATEST_APK_FILE}`, request.url), { method: 'HEAD', cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function HEAD(request: Request) {
  const available = Boolean(externalArtifactUrl()) || (await staticArtifactAvailable(request));
  return new NextResponse(null, {
    status: available ? 200 : 404,
    headers: { 'Content-Type': 'application/vnd.android.package-archive', 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: Request) {
  const external = externalArtifactUrl();
  if (external) return NextResponse.redirect(external, 307);
  if (await staticArtifactAvailable(request)) {
    return NextResponse.redirect(new URL(`/downloads/${LATEST_APK_FILE}`, request.url), 307);
  }
  return NextResponse.json(
    { error: 'No installable Android APK has been published yet.' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } }
  );
}
