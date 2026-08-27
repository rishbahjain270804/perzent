import { NextResponse } from 'next/server';
import { versionInfo } from '@/lib/app-version';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json(versionInfo(origin), { headers: { 'Cache-Control': 'no-store' } });
}
