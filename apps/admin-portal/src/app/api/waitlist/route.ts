import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@perzent/database';
import { z } from 'zod';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { operatorAuthorized } from '@/lib/operator';

export const dynamic = 'force-dynamic';

const WaitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  company_name: z.string().max(200).optional(),
  staff_size: z.number().min(1).max(5000).optional().default(10),
  phone: z.string().max(20).optional(),
});

/** POST /api/waitlist — Capture early-access interest */
export async function POST(request: Request) {
  try {
    const retryAfter = rateLimit(`waitlist:${clientIp(request)}`, 5, 10 * 60_000);
    if (retryAfter !== null) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a few minutes.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    const body = WaitlistSchema.parse(await request.json());
    const email = body.email.toLowerCase().trim();

    await prisma.waitlistEntry.upsert({
      where: { email },
      update: {},                          // no-op if already exists
      create: {
        email,
        company_name: body.company_name?.trim() || null,
        staff_size: body.staff_size,
        phone: body.phone?.trim() || null,
        source: 'COMING_SOON_PAGE',
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 = unique constraint (race condition on email)
      if (error.code === 'P2002') {
        return NextResponse.json({ success: true }, { status: 200 });
      }
    }
    console.error('Waitlist API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}

/**
 * The lead list is operator data (JSP Coders), not tenant data — same bearer secret as the
 * operator console: curl -H "Authorization: Bearer $OPERATOR_SECRET" …/api/waitlist
 */
export async function GET(request: Request) {
  try {
    if (!operatorAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));

    const [total, entries] = await Promise.all([
      prisma.waitlistEntry.count(),
      prisma.waitlistEntry.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          id: true,
          email: true,
          company_name: true,
          staff_size: true,
          phone: true,
          source: true,
          created_at: true,
        },
      }),
    ]);

    return NextResponse.json({ success: true, total, entries });
  } catch (error) {
    console.error('Waitlist GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve waitlist entries' },
      { status: 500 },
    );
  }
}
