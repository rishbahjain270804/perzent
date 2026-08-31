import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@perzent/database';
import { z } from 'zod';

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
    const body = WaitlistSchema.parse(await request.json());
    const email = body.email.toLowerCase().trim();

    const entry = await prisma.waitlistEntry.upsert({
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

/** GET /api/waitlist — Fetch total waitlist count and recent leads */
export async function GET(request: Request) {
  try {
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

    return NextResponse.json({
      success: true,
      total,
      entries,
    });
  } catch (error) {
    console.error('Waitlist GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve waitlist entries' },
      { status: 500 },
    );
  }
}
