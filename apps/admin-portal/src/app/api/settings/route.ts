import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

const SettingsSchema = z.object({
  auto_checkout_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  max_break_minutes: z.number().int().min(5).max(180),
  timezone: z.string().min(1).max(100),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const company = await prisma.company.findUniqueOrThrow({ where: { id: session.companyId } });
    return NextResponse.json({
      auto_checkout_time: company.auto_checkout_time,
      max_break_minutes: company.max_break_minutes,
      route_retention_days: company.route_retention_days,
      attendance_retention_days: company.attendance_retention_days,
      timezone: company.timezone,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const parsed = SettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const company = await prisma.company.update({
      where: { id: session.companyId },
      data: parsed.data,
    });
    return NextResponse.json({
      auto_checkout_time: company.auto_checkout_time,
      max_break_minutes: company.max_break_minutes,
      route_retention_days: company.route_retention_days,
      attendance_retention_days: company.attendance_retention_days,
      timezone: company.timezone,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
