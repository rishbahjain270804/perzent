import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@perzent/database';
import { RegisterCompanySchema, LoginSchema } from '@perzent/shared-types';
import {
  authErrorResponse,
  clearSessionCookie,
  createSession,
  requireSession,
  revokeSession,
  setSessionCookie,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

const userPayload = (user: any) => ({
  user_id: user.id,
  company_id: user.company_id,
  company_name: user.company?.name,
  role: user.role,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
  designation: user.designation,
  department_id: user.department_id,
  manager_id: user.manager_id,
});

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      include: { company: { select: { name: true } } },
    });
    return NextResponse.json(userPayload(user));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'register') {
      const parsed = RegisterCompanySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const email = parsed.data.email.toLowerCase();
      const existing = await prisma.company.findUnique({ where: { owner_email: email } });
      if (existing) {
        return NextResponse.json({ error: 'Company email already registered' }, { status: 409 });
      }

      const passwordHash = await hash(parsed.data.password, 12);
      const user = await prisma.$transaction(async (tx: any) => {
        const company = await tx.company.create({
          data: {
            name: parsed.data.company_name,
            owner_email: email,
            timezone: parsed.data.timezone || 'Asia/Kolkata',
          },
        });
        await tx.department.create({ data: { company_id: company.id, name: 'General' } });
        return tx.user.create({
          data: {
            company_id: company.id,
            full_name: parsed.data.owner_name,
            email,
            phone: parsed.data.phone,
            password_hash: passwordHash,
            role: 'OWNER',
            designation: 'Company Owner',
          },
          include: { company: { select: { name: true } } },
        });
      });

      const session = await createSession(user.id);
      const response = NextResponse.json(userPayload(user), { status: 201 });
      setSessionCookie(response, session.token, session.expiresAt);
      return response;
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const identifier = parsed.data.phone_or_email.trim();
    const user = await prisma.user.findFirst({
      where: { OR: [{ phone: identifier }, { email: identifier.toLowerCase() }] },
      include: { company: { select: { name: true } } },
    });
    if (!user || !(await compare(parsed.data.password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid phone/email or password' }, { status: 401 });
    }
    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is inactive. Please contact administration.' }, { status: 403 });
    }

    if (parsed.data.device_uuid) {
      // Mobile app login: only EMPLOYEE and MANAGER accounts can use the mobile app
      if (user.role !== 'EMPLOYEE' && user.role !== 'MANAGER') {
        return NextResponse.json({
          error: 'Only Employee and Manager accounts can log in to the mobile app. Company Owners should log in via the web portal.',
        }, { status: 403 });
      }
      const existingDevice = await prisma.userDevice.findFirst({
        where: { user_id: user.id, is_active: true },
      });
      if (existingDevice && existingDevice.device_uuid !== parsed.data.device_uuid) {
        return NextResponse.json(
          { error: 'Device mismatch. Account is bound to another phone. Contact your manager or company owner to reset.' },
          { status: 403 }
        );
      }
      await prisma.userDevice.upsert({
        where: { user_id_device_uuid: { user_id: user.id, device_uuid: parsed.data.device_uuid } },
        update: {
          is_active: true,
          device_model: parsed.data.device_model || 'Unknown',
          os_version: parsed.data.os_version || 'Unknown',
          last_seen_at: new Date(),
        },
        create: {
          user_id: user.id,
          device_uuid: parsed.data.device_uuid,
          device_model: parsed.data.device_model || 'Unknown',
          os_version: parsed.data.os_version || 'Unknown',
        },
      });
    } else {
      // Web portal login: ONLY Company Owner can log in via website
      if (user.role !== 'OWNER') {
        return NextResponse.json({
          error: 'Only Company Owners can log in to the web portal. Managers and Employees must log in using the Perzent Mobile App.',
        }, { status: 403 });
      }
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({
      ...userPayload(user),
      ...(parsed.data.device_uuid ? { token: session.token } : {}),
    });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
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
