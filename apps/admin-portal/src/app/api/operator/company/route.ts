import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { operatorAuthorized } from '@/lib/operator';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** GET /api/operator/company?id=<companyId> — one company's full roster for the operator console. */
export async function GET(request: Request) {
  try {
    const retryAfter = rateLimit(`operator:${clientIp(request)}`, 60, 10 * 60_000);
    if (retryAfter !== null) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
    }
    if (!operatorAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        owner_email: true,
        timezone: true,
        plan_tier: true,
        auto_checkout_time: true,
        max_break_minutes: true,
        created_at: true,
        departments: { select: { id: true, name: true } },
        users: {
          orderBy: [{ role: 'asc' }, { created_at: 'asc' }],
          select: {
            id: true,
            full_name: true,
            role: true,
            phone: true,
            email: true,
            designation: true,
            status: true,
            created_at: true,
            department: { select: { name: true } },
            manager: { select: { full_name: true } },
          },
        },
      },
    });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Operator company error:', error);
    return NextResponse.json({ error: 'Failed to load company' }, { status: 500 });
  }
}
