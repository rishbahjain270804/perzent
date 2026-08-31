import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';
import { isOpen } from '@/lib/attendance';

export const dynamic = 'force-dynamic';

const MAX_DAYS = 31;

/**
 * The employee's own recent shifts (newest first) so the app can answer "what did I work this
 * week?" and explain an auto check-out the next morning. Read-only; scoped to the session user.
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER']);
    const url = new URL(request.url);
    const days = Math.min(MAX_DAYS, Math.max(1, Number(url.searchParams.get('days')) || 7));
    const since = new Date(Date.now() - days * 86_400_000);
    since.setUTCHours(0, 0, 0, 0);

    const records = await prisma.attendanceRecord.findMany({
      where: { user_id: session.userId, work_date: { gte: since } },
      orderBy: { work_date: 'desc' },
      take: MAX_DAYS,
      select: {
        id: true,
        work_date: true,
        status: true,
        punch_in_time: true,
        punch_out_time: true,
        punch_in_by: true,
        punch_out_by: true,
        gross_worked_minutes: true,
        total_break_minutes: true,
        net_worked_minutes: true,
        override_reason: true,
      },
    });

    const shifts = records.map((r) => ({
      id: r.id,
      work_date: r.work_date.toISOString().slice(0, 10),
      status: r.status,
      is_open: isOpen(r.status),
      punch_in_time: r.punch_in_time.toISOString(),
      punch_out_time: r.punch_out_time?.toISOString() || null,
      punch_in_by: r.punch_in_by,
      punch_out_by: r.punch_out_by,
      /** True when the shift was closed by the company's auto check-out rule, not by the employee. */
      auto_checked_out: r.status === 'AUTO_CHECKED_OUT',
      /** True when a manager corrected the times. */
      corrected: Boolean(r.override_reason),
      gross_worked_minutes: r.gross_worked_minutes,
      total_break_minutes: r.total_break_minutes,
      net_worked_minutes: r.net_worked_minutes,
    }));

    const closed = shifts.filter((s) => !s.is_open);
    return NextResponse.json({
      days,
      shifts,
      totals: {
        shifts: closed.length,
        net_worked_minutes: closed.reduce((sum, s) => sum + s.net_worked_minutes, 0),
        total_break_minutes: closed.reduce((sum, s) => sum + s.total_break_minutes, 0),
        auto_checked_out: closed.filter((s) => s.auto_checked_out).length,
      },
      server_time: new Date().toISOString(),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
