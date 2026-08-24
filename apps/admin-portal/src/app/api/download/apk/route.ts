import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const fileName = 'perzent-employee-v1.1.0.apk';

function getArtifactUrl() {
  const value = process.env.EMPLOYEE_APK_URL;
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getLocalArtifactPath() {
  return path.join(process.cwd(), 'public', 'downloads', fileName);
}

async function hasPublishedArtifact(request: Request) {
  if (getArtifactUrl() || fs.existsSync(getLocalArtifactPath())) return true;

  try {
    const response = await fetch(new URL(`/downloads/${fileName}`, request.url), {
      method: 'HEAD',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function HEAD(request: Request) {
  if (await hasPublishedArtifact(request)) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Cache-Control': 'no-store',
      },
    });
  }

  return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  const artifactUrl = getArtifactUrl();
  if (artifactUrl) return NextResponse.redirect(artifactUrl, 307);

  if (await hasPublishedArtifact(request)) {
    return NextResponse.redirect(new URL(`/downloads/${fileName}`, request.url), 307);
  }

  return NextResponse.json(
    { error: 'No installable Android APK has been published.' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } }
  );
}
