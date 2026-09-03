import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { BRAND } from '@perzent/shared-types';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { emailEnabled, sendEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
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

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

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

/**
 * Best-effort notification to the people who can act on an SOS: every active owner plus the
 * sender's manager. Email failures must never fail the SOS itself — the alert row and the
 * dashboard banner are the source of truth; email is an accelerant.
 */
async function notifySosContacts(input: {
  companyId: string;
  senderId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}) {
  if (!emailEnabled()) return;
  const sender = await prisma.user.findUnique({
    where: { id: input.senderId },
    select: { full_name: true, phone: true, designation: true, manager_id: true },
  });
  if (!sender) return;
  const recipients = await prisma.user.findMany({
    where: {
      company_id: input.companyId,
      status: 'ACTIVE',
      email: { not: null },
      OR: [{ role: 'OWNER' }, ...(sender.manager_id ? [{ id: sender.manager_id }] : [])],
    },
    select: { email: true },
  });
  if (recipients.length === 0) return;

  const maps = `https://www.google.com/maps?q=${input.latitude},${input.longitude}`;
  const dashboard = `${BRAND.webUrl}/dashboard/sos`;
  const subject = `SOS alert: ${sender.full_name} needs help`;
  const text =
    `${sender.full_name} (${sender.designation}) triggered an emergency SOS.\n\n` +
    `Live location: ${maps}\nGPS accuracy: about ${Math.round(input.accuracy)} m\nPhone: ${sender.phone}\n\n` +
    `Respond from the dashboard: ${dashboard}`;
  const html =
    `<p><strong>${escapeHtml(sender.full_name)}</strong> (${escapeHtml(sender.designation)}) triggered an emergency SOS.</p>` +
    `<p><a href="${maps}">Open their live location on the map</a> (GPS accuracy about ${Math.round(input.accuracy)} m)</p>` +
    `<p>Phone: ${escapeHtml(sender.phone)}</p>` +
    `<p><a href="${dashboard}">Respond from the ${escapeHtml(BRAND.productName)} dashboard</a></p>`;

  await Promise.allSettled(
    recipients.map((recipient) => sendEmail({ to: recipient.email as string, subject, text, html })),
  );
}

/** POST /api/sos — Dispatch instant emergency SOS alert with exact GPS coordinates */
export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER', 'OWNER']);

    const retryAfter = rateLimit(`sos:${session.userId}`, 5, 5 * 60_000);
    if (retryAfter !== null) {
      return jsonError('Please wait a moment before sending another SOS.', 429, 'RATE_LIMITED');
    }

    const body = CreateSosSchema.parse(await request.json());

    // An un-resolved alert already exists: refresh its position instead of stacking duplicates.
    const existing = await prisma.sosAlert.findFirst({
      where: { user_id: session.userId, status: 'ACTIVE' },
      orderBy: { created_at: 'desc' },
    });
    if (existing) {
      const refreshed = await prisma.sosAlert.update({
        where: { id: existing.id },
        data: { latitude: body.latitude, longitude: body.longitude, accuracy: body.accuracy },
      });
      return NextResponse.json(refreshed, { status: 200 });
    }

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

    try {
      await notifySosContacts({
        companyId: session.companyId,
        senderId: session.userId,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy,
      });
    } catch (notifyError) {
      console.error('SOS notification failed:', notifyError);
    }

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
    if (alert.status !== 'ACTIVE') {
      return jsonError(`This alert was already ${alert.status.toLowerCase()}`, 409, 'CONFLICT');
    }

    const resolutionNote = body.note?.trim();
    const updated = await prisma.sosAlert.update({
      where: { id: alert.id },
      data: {
        status: body.action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED',
        resolved_by_id: session.userId,
        resolved_at: new Date(),
        // Keep the original alert note unless the reviewer wrote a resolution note.
        ...(resolutionNote ? { note: resolutionNote } : {}),
      },
    });

    return NextResponse.json({ success: true, alert: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}
