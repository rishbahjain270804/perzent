import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { CompanySettingsSchema } from '@perzent/shared-types';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { isValidTimeZone } from '@/lib/time';

export const dynamic = 'force-dynamic';

const settingsView = (company: any) => ({
  name: company.name,
  auto_checkout_time: company.auto_checkout_time,
  max_break_minutes: company.max_break_minutes,
  standard_daily_hours: company.standard_daily_hours,
  route_retention_days: company.route_retention_days,
  attendance_retention_days: company.attendance_retention_days,
  timezone: company.timezone,
  plan_tier: company.plan_tier,
});

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const company = await prisma.company.findUniqueOrThrow({ where: { id: session.companyId } });
    return NextResponse.json(settingsView(company));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const parsed = CompanySettingsSchema.parse(await request.json());
    if (parsed.timezone && !isValidTimeZone(parsed.timezone)) return jsonError('Unknown timezone', 400, 'VALIDATION');
    const data = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined));
    if (Object.keys(data).length === 0) return jsonError('Nothing to update', 400, 'VALIDATION');
    const company = await prisma.company.update({ where: { id: session.companyId }, data });
    return NextResponse.json(settingsView(company));
  } catch (error) {
    return authErrorResponse(error);
  }
}
