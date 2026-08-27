import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@perzent/database';
import { ChangePasswordSchema, LoginSchema, RegisterCompanySchema } from '@perzent/shared-types';
import {
  ApiError,
  authErrorResponse,
  clearSessionCookie,
  createSession,
  jsonError,
  requireSession,
  revokeSession,
  revokeUserSessions,
  setSessionCookie,
} from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { isValidTimeZone } from '@/lib/time';

export const dynamic = 'force-dynamic';

const companySelect = {
  name: true,
  timezone: true,
  auto_checkout_time: true,
  max_break_minutes: true,
  route_retention_days: true,
  attendance_retention_days: true,
  standard_daily_hours: true,
  plan_tier: true,
} as const;

const userPayload = (user: any) => ({
  user_id: user.id,
  company_id: user.company_id,
  company_name: user.company?.name,
  company: user.company,
  role: user.role,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
  designation: user.designation,
  department_id: user.department_id,
  manager_id: user.manager_id,
});

const normalizeIdentifier = (value: string) => value.trim();
const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '');

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      include: { company: { select: companySelect } },
    });
    return NextResponse.json(userPayload(user));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = clientIp(request);

    if (body?.action === 'register') {
      const blocked = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
      if (blocked) return jsonError(`Too many registrations. Try again in ${blocked}s.`, 429, 'RATE_LIMITED');

      const parsed = RegisterCompanySchema.parse(body);
      if (!isValidTimeZone(parsed.timezone)) return jsonError('Unknown timezone', 400, 'VALIDATION');

      const email = parsed.email.toLowerCase();
      const phone = normalizePhone(parsed.phone);
      const existing = await prisma.company.findUnique({ where: { owner_email: email } });
      if (existing) return jsonError('This email is already registered. Sign in instead.', 409, 'CONFLICT');

      const passwordHash = await hash(parsed.password, 12);
      const user = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { name: parsed.company_name, owner_email: email, timezone: parsed.timezone, plan_tier: 'FREE' },
        });
        await tx.department.create({ data: { company_id: company.id, name: 'General' } });
        return tx.user.create({
          data: {
            company_id: company.id,
            full_name: parsed.owner_name,
            email,
            phone,
            password_hash: passwordHash,
            role: 'OWNER',
            designation: 'Company Owner',
          },
          include: { company: { select: companySelect } },
        });
      });

      const session = await createSession(user.id);
      const response = NextResponse.json(userPayload(user), { status: 201 });
      setSessionCookie(response, session.token, session.expiresAt);
      return response;
    }

    if (body?.action === 'change_password') {
      const session = await requireSession(request);
      const parsed = ChangePasswordSchema.parse(body);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
      if (!(await compare(parsed.current_password, user.password_hash))) {
        return jsonError('Current password is incorrect', 400, 'VALIDATION');
      }
      await prisma.user.update({ where: { id: user.id }, data: { password_hash: await hash(parsed.new_password, 12) } });
      await revokeUserSessions(user.id, session.sessionId);
      return NextResponse.json({ success: true });
    }

    // Login
    const parsed = LoginSchema.parse(body);
    const identifier = normalizeIdentifier(parsed.phone_or_email);
    const limitKey = `login:${ip}:${identifier.toLowerCase()}`;
    const blocked = rateLimit(limitKey, 10, 10 * 60 * 1000);
    if (blocked) return jsonError(`Too many sign-in attempts. Try again in ${blocked}s.`, 429, 'RATE_LIMITED');

    const candidates = await prisma.user.findMany({
      where: {
        OR: [
          { phone: identifier },
          { phone: normalizePhone(identifier) },
          { email: identifier.toLowerCase() },
        ],
      },
      include: { company: { select: companySelect } },
      take: 5,
    });

    let user: (typeof candidates)[number] | null = null;
    for (const candidate of candidates) {
      if (await compare(parsed.password, candidate.password_hash)) {
        user = candidate;
        break;
      }
    }
    if (!user) {
      // Burn equivalent time when no candidate exists so response timing does not reveal account presence.
      if (candidates.length === 0) await hash(parsed.password, 12);
      return jsonError('Invalid phone/email or password', 401, 'INVALID_CREDENTIALS');
    }
    if (user.status !== 'ACTIVE') {
      return jsonError('Account is inactive. Please contact your company owner.', 403, 'INACTIVE');
    }

    if (parsed.device_uuid) {
      if (user.role !== 'EMPLOYEE' && user.role !== 'MANAGER') {
        return jsonError(
          'Only Employee and Manager accounts can use the mobile app. Company owners sign in on the web portal.',
          403,
          'ROLE_NOT_ALLOWED'
        );
      }
      const existingDevice = await prisma.userDevice.findFirst({ where: { user_id: user.id, is_active: true } });
      if (existingDevice && existingDevice.device_uuid !== parsed.device_uuid) {
        return jsonError(
          'This account is bound to another phone. Ask your manager or company owner to reset the device.',
          403,
          'DEVICE_MISMATCH'
        );
      }
      await prisma.userDevice.upsert({
        where: { user_id_device_uuid: { user_id: user.id, device_uuid: parsed.device_uuid } },
        update: {
          is_active: true,
          device_model: parsed.device_model || 'Unknown',
          os_version: parsed.os_version || 'Unknown',
          last_seen_at: new Date(),
        },
        create: {
          user_id: user.id,
          device_uuid: parsed.device_uuid,
          device_model: parsed.device_model || 'Unknown',
          os_version: parsed.os_version || 'Unknown',
        },
      });
    } else if (user.role !== 'OWNER') {
      return jsonError(
        'Only company owners can sign in to the web portal. Managers and employees use the Perzent mobile app.',
        403,
        'ROLE_NOT_ALLOWED'
      );
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({
      ...userPayload(user),
      ...(parsed.device_uuid ? { token: session.token } : {}),
    });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error.message, error.status, error.code);
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await revokeSession(request);
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
