import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getLatestApkFilename(): string {
  const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
  if (!fs.existsSync(downloadsDir)) return 'perzent-employee-v1.1.2.apk';

  const files = fs.readdirSync(downloadsDir).filter((f) => f.endsWith('.apk'));
  if (files.length === 0) return 'perzent-employee-v1.1.2.apk';

  // Sort files by mtime (newest first) or preference
  files.sort((a, b) => {
    try {
      const statA = fs.statSync(path.join(downloadsDir, a));
      const statB = fs.statSync(path.join(downloadsDir, b));
      return statB.mtimeMs - statA.mtimeMs;
    } catch {
      return 0;
    }
  });

  return files[0];
}

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
  const latestFile = getLatestApkFilename();
  const primary = path.join(process.cwd(), 'public', 'downloads', latestFile);
  if (fs.existsSync(primary)) return primary;

  const fallback = path.join(process.cwd(), 'public', 'downloads', 'perzent-employee-latest.apk');
  if (fs.existsSync(fallback)) return fallback;

  return primary;
}

async function hasPublishedArtifact(request: Request) {
  if (getArtifactUrl() || fs.existsSync(getLocalArtifactPath())) return true;

  try {
    const latestFile = getLatestApkFilename();
    const response = await fetch(new URL(`/downloads/${latestFile}`, request.url), {
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

  const latestFile = getLatestApkFilename();
  if (await hasPublishedArtifact(request)) {
    return NextResponse.redirect(new URL(`/downloads/${latestFile}`, request.url), 307);
  }

  return NextResponse.json(
    { error: 'No installable Android APK has been published.' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } }
  );
}
