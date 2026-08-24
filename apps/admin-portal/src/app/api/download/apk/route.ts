import { NextResponse } from 'next/server';

export async function GET() {
  const artifactUrl = process.env.EMPLOYEE_APK_URL;
  if (!artifactUrl) {
    return NextResponse.json(
      { error: 'The signed Android build has not been published yet.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  try {
    return NextResponse.redirect(new URL(artifactUrl), 307);
  } catch {
    return NextResponse.json({ error: 'The configured APK URL is invalid.' }, { status: 500 });
  }
}
