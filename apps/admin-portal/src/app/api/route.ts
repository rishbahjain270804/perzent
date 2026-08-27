import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { LATEST_APP_VERSION, LATEST_APP_VERSION_CODE } from '@/lib/app-version';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  let database: 'ok' | 'error' = 'ok';
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
  } catch {
    database = 'error';
  }
  const healthy = database === 'ok';
  return NextResponse.json(
    {
      service: 'perzent-api',
      status: healthy ? 'ok' : 'degraded',
      checks: { database, latency_ms: Date.now() - startedAt },
      mobile_app: { latest_version: LATEST_APP_VERSION, latest_version_code: LATEST_APP_VERSION_CODE },
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
