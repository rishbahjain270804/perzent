import { NextResponse } from 'next/server';
import { runMaintenance } from '@/lib/policy';
import { safeEqual } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily housekeeping (Vercel Cron → GET with `Authorization: Bearer <CRON_SECRET>`):
 * auto check-out overdue shifts, end over-long breaks, purge expired sessions and old route points.
 * Policies are also enforced lazily on normal API reads, so the cron is a backstop.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || !safeEqual(header.slice(7), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runMaintenance();
    return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), ...summary });
  } catch (error) {
    console.error('Cron maintenance failed', error);
    return NextResponse.json({ ok: false, error: 'Maintenance failed' }, { status: 500 });
  }
}
