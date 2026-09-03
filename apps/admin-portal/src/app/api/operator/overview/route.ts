import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { operatorAuthorized } from '@/lib/operator';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/overview — platform-wide snapshot for the JSP Coders operator console:
 * every company with its owners and activity, role totals, and the early-access waitlist.
 */
export async function GET(request: Request) {
  try {
    const retryAfter = rateLimit(`operator:${clientIp(request)}`, 30, 10 * 60_000);
    if (retryAfter !== null) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
    }
    if (!operatorAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [companies, roleCounts, waitlist, waitlistTotal, checkins24h, activeSessions, lastActivityRows] =
      await Promise.all([
        prisma.company.findMany({
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            name: true,
            owner_email: true,
            timezone: true,
            plan_tier: true,
            created_at: true,
            _count: { select: { users: true } },
            users: {
              where: { role: 'OWNER' },
              select: { full_name: true, email: true, phone: true, status: true },
              take: 5,
            },
          },
        }),
        prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
        prisma.waitlistEntry.findMany({
          orderBy: { created_at: 'desc' },
          take: 100,
          select: { id: true, email: true, company_name: true, staff_size: true, phone: true, source: true, created_at: true },
        }),
        prisma.waitlistEntry.count(),
        prisma.attendanceRecord.count({ where: { punch_in_time: { gte: since24h } } }),
        prisma.session.count({ where: { expires_at: { gt: new Date() } } }),
        prisma.$queryRaw<Array<{ company_id: string; last_punch: Date | null }>>`
          SELECT u.company_id, MAX(a.punch_in_time) AS last_punch
          FROM "AttendanceRecord" a
          JOIN "User" u ON u.id = a.user_id
          GROUP BY u.company_id
        `,
      ]);

    const lastActivity = new Map(lastActivityRows.map((row) => [row.company_id, row.last_punch]));
    const roles = Object.fromEntries(roleCounts.map((entry) => [entry.role, entry._count._all]));

    return NextResponse.json({
      totals: {
        companies: companies.length,
        owners: roles.OWNER ?? 0,
        managers: roles.MANAGER ?? 0,
        employees: roles.EMPLOYEE ?? 0,
        waitlist: waitlistTotal,
        checkins_24h: checkins24h,
        active_sessions: activeSessions,
      },
      companies: companies.map((company) => ({
        id: company.id,
        name: company.name,
        owner_email: company.owner_email,
        timezone: company.timezone,
        plan_tier: company.plan_tier,
        created_at: company.created_at,
        user_count: company._count.users,
        owners: company.users,
        last_activity: lastActivity.get(company.id) ?? null,
      })),
      waitlist,
    });
  } catch (error) {
    console.error('Operator overview error:', error);
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}
