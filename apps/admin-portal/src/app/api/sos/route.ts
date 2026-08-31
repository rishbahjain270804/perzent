import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateSosSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional().default(10),
  note: z.string().optional(),
});

const ReviewSosSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['RESOLVE', 'DISMISS']),
  note: z.string().optional(),
});

/** GET /api/sos — Fetch active/past emergency SOS alerts for manager or current user's active SOS */
export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER', 'EMPLOYEE']);
    const statusParam = new URL(request.url).searchParams.get('status');

    if (session.role === 'EMPLOYEE') {
      const activeAlert = await prisma.sosAlert.findFirst({
        where: {
          user_id: session.userId,
          status: 'ACTIVE',
        },
        orderBy: { created_at: 'desc' },
      });
      return NextResponse.json({ activeAlert });
    }

    const alerts = await prisma.sosAlert.findMany({
      where: {
        company_id: session.companyId,
        ...(session.role === 'MANAGER' ? { user: { manager_id: session.userId } } : {}),
        ...(statusParam === 'ACTIVE' ? { status: 'ACTIVE' } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            designation: true,
            department: { select: { name: true } },
          },
        },
        resolver: { select: { full_name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/sos — Dispatch instant emergency SOS alert with exact GPS coordinates */
export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER', 'OWNER']);
    const body = CreateSosSchema.parse(await request.json());

    // Create emergency SOS alert
    const created = await prisma.sosAlert.create({
      data: {
        company_id: session.companyId,
        user_id: session.userId,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy,
        note: body.note || 'EMERGENCY SOS DISPATCH',
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            full_name: true,
            phone: true,
            designation: true,
          },
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** PATCH /api/sos — Resolve or dismiss an active emergency alert */
export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const body = ReviewSosSchema.parse(await request.json());

    const alert = await prisma.sosAlert.findFirst({
      where: {
        id: body.id,
        company_id: session.companyId,
      },
    });

    if (!alert) return jsonError('SOS alert not found', 404, 'NOT_FOUND');

    const updated = await prisma.sosAlert.update({
      where: { id: alert.id },
      data: {
        status: body.action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED',
        resolved_by_id: session.userId,
        resolved_at: new Date(),
        note: body.note || null,
      },
    });

    return NextResponse.json({ success: true, alert: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}
