import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { prisma } from '@perzent/database';
import { KioskPunchSchema } from '@perzent/shared-types';
import { checkIn, checkOut, isOpen, resolveCurrentAttendance } from '@/lib/attendance';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { getCompanyPolicy } from '@/lib/policy';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '');

/**
 * Kiosk terminal punch. The terminal itself must be signed in as the company owner/manager
 * (cookie session); the employee then identifies with phone + their app password.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const body = KioskPunchSchema.parse(await request.json());
    const blocked = rateLimit(`kiosk:${session.companyId}`, 60, 60 * 1000);
    if (blocked) return jsonError(`Too many punches. Try again in ${blocked}s.`, 429, 'RATE_LIMITED');

    const phone = normalizePhone(body.phone);
    const user = await prisma.user.findFirst({
      where: {
        company_id: session.companyId,
        role: { in: ['EMPLOYEE', 'MANAGER'] },
        status: 'ACTIVE',
        OR: [{ phone }, { phone: body.phone.trim() }],
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
      },
    });
    if (!user || !(await compare(body.password, user.password_hash))) {
      return jsonError('Phone number or password is incorrect', 401, 'INVALID_CREDENTIALS');
    }

    const policy = await getCompanyPolicy(session.companyId);

    if (body.site_id) {
      const site = await prisma.geofenceSite.findFirst({ where: { id: body.site_id, company_id: session.companyId, is_active: true } });
      if (!site) return jsonError('Selected site does not exist', 400, 'VALIDATION');
    }

    if (body.action === 'CHECK_IN') {
      const { record, resumed } = await checkIn({ userId: user.id, policy, by: 'KIOSK', siteId: body.site_id || null });
      return NextResponse.json(
        {
          success: true,
          action: 'CHECKED_IN',
          resumed,
          user_name: user.full_name,
          punch_in_time: record.punch_in_time.toISOString(),
          message: resumed ? `Welcome back, ${user.full_name}. Shift resumed.` : `Welcome, ${user.full_name}. Shift started.`,
        },
        { status: resumed ? 200 : 201 }
      );
    }

    const current = await resolveCurrentAttendance(user.id, policy);
    if (!current || !isOpen(current.status)) return jsonError('No active shift to clock out of.', 409, 'NO_ACTIVE_SHIFT');
    const updated = await checkOut({ record: current, by: 'KIOSK' });
    const hours = updated.net_worked_minutes / 60;
    return NextResponse.json({
      success: true,
      action: 'CHECKED_OUT',
      user_name: user.full_name,
      punch_out_time: updated.punch_out_time?.toISOString(),
      worked_hours: hours.toFixed(2),
      message: `Goodbye, ${user.full_name}. Net worked today: ${hours.toFixed(1)} h.`,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
