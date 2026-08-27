import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@perzent/database';
import { EmployeeActionSchema, ProvisionEmployeeSchema } from '@perzent/shared-types';
import { authErrorResponse, jsonError, requireSession, revokeUserSessions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const employeeInclude = {
  manager: { select: { full_name: true } },
  department: { select: { name: true } },
  devices: { where: { is_active: true }, orderBy: { last_seen_at: 'desc' as const }, take: 1 },
};

const employeeView = (user: any) => {
  const device = user.devices?.[0];
  return {
    id: user.id,
    company_id: user.company_id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    designation: user.designation,
    status: user.status,
    manager_id: user.manager_id,
    department_id: user.department_id,
    manager_name: user.manager?.full_name || null,
    department_name: user.department?.name || 'Unassigned',
    device_info: device ? `${device.device_model || 'Unknown'} (${device.os_version || 'Unknown'})` : 'No device bound',
    device_model: device?.device_model || null,
    os_version: device?.os_version || null,
    device_uuid: device?.device_uuid || null,
    device_last_seen_at: device?.last_seen_at ? device.last_seen_at.toISOString() : null,
    is_device_bound: Boolean(device),
    created_at: user.created_at?.toISOString(),
  };
};

const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '');
const emptyToNull = (value: string | null | undefined) => (value ? value : null);

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const users = await prisma.user.findMany({
      where: {
        company_id: session.companyId,
        role: { not: 'OWNER' },
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
      },
      include: employeeInclude,
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(users.map(employeeView));
  } catch (error) {
    return authErrorResponse(error);
  }
}

async function validateAssignments(companyId: string, departmentId: string | null, managerId: string | null, selfId?: string) {
  const [department, manager] = await Promise.all([
    departmentId
      ? prisma.department.findFirst({ where: { id: departmentId, company_id: companyId } })
      : prisma.department.findFirst({ where: { company_id: companyId }, orderBy: { created_at: 'asc' } }),
    managerId
      ? prisma.user.findFirst({ where: { id: managerId, company_id: companyId, role: { in: ['OWNER', 'MANAGER'] }, status: 'ACTIVE' } })
      : Promise.resolve(null),
  ]);
  if (departmentId && !department) return { error: 'Department does not belong to this company' };
  if (managerId && !manager) return { error: 'Manager must be an active manager or owner of this company' };
  if (managerId && selfId && managerId === selfId) return { error: 'An employee cannot be their own manager' };
  return { department, manager };
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const parsed = ProvisionEmployeeSchema.parse(await request.json());
    const phone = normalizePhone(parsed.phone);

    const existing = await prisma.user.findFirst({ where: { company_id: session.companyId, phone } });
    if (existing) return jsonError('An employee with this phone number already exists.', 409, 'CONFLICT');
    if (parsed.email) {
      const emailTaken = await prisma.user.findFirst({ where: { company_id: session.companyId, email: parsed.email.toLowerCase() } });
      if (emailTaken) return jsonError('An employee with this email already exists.', 409, 'CONFLICT');
    }

    const assignedManagerId = session.role === 'MANAGER' ? session.userId : emptyToNull(parsed.manager_id);
    const assignedRole = session.role === 'MANAGER' ? 'EMPLOYEE' : parsed.role || 'EMPLOYEE';
    const assignments = await validateAssignments(session.companyId, emptyToNull(parsed.department_id), assignedManagerId);
    if ('error' in assignments) return jsonError(assignments.error!, 400, 'VALIDATION');

    const user = await prisma.user.create({
      data: {
        company_id: session.companyId,
        full_name: parsed.full_name,
        phone,
        email: parsed.email ? parsed.email.toLowerCase() : null,
        password_hash: await hash(parsed.password, 12),
        designation: parsed.designation || 'Field Staff',
        role: assignedRole,
        department_id: assignments.department?.id ?? null,
        manager_id: assignments.manager?.id ?? null,
      },
      include: employeeInclude,
    });
    return NextResponse.json(employeeView(user), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const parsed = EmployeeActionSchema.parse(await request.json());

    const user = await prisma.user.findFirst({
      where: {
        id: parsed.id,
        company_id: session.companyId,
        role: { not: 'OWNER' },
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
      },
    });
    if (!user) return jsonError('Employee not found', 404, 'NOT_FOUND');

    if (session.role === 'MANAGER' && parsed.action !== 'RESET_DEVICE') {
      return jsonError('Only the company owner can perform this action', 403);
    }

    if (parsed.action === 'RESET_DEVICE') {
      await prisma.$transaction([
        prisma.userDevice.updateMany({ where: { user_id: user.id, is_active: true }, data: { is_active: false } }),
        prisma.session.deleteMany({ where: { user_id: user.id } }),
      ]);
    } else if (parsed.action === 'SUSPEND') {
      await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } });
      await revokeUserSessions(user.id);
    } else if (parsed.action === 'REACTIVATE') {
      await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
    } else if (parsed.action === 'RESET_PASSWORD') {
      await prisma.user.update({ where: { id: user.id }, data: { password_hash: await hash(parsed.new_password, 12) } });
      await revokeUserSessions(user.id);
    } else if (parsed.action === 'UPDATE') {
      const nextRole = parsed.role ?? user.role;
      const managerId = parsed.manager_id === undefined ? user.manager_id : emptyToNull(parsed.manager_id as string | null);
      const departmentId = parsed.department_id === undefined ? user.department_id : emptyToNull(parsed.department_id as string | null);

      if (nextRole === 'EMPLOYEE' && user.role === 'MANAGER') {
        const reports = await prisma.user.count({ where: { manager_id: user.id } });
        if (reports > 0) return jsonError('Reassign this manager\'s team members before changing their role.', 409, 'CONFLICT');
      }
      const assignments = await validateAssignments(session.companyId, departmentId, managerId, user.id);
      if ('error' in assignments) return jsonError(assignments.error!, 400, 'VALIDATION');

      const email = parsed.email === undefined ? user.email : parsed.email ? String(parsed.email).toLowerCase() : null;
      if (email && email !== user.email) {
        const emailTaken = await prisma.user.findFirst({ where: { company_id: session.companyId, email, id: { not: user.id } } });
        if (emailTaken) return jsonError('Another employee already uses this email.', 409, 'CONFLICT');
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          full_name: parsed.full_name ?? user.full_name,
          designation: parsed.designation ?? user.designation,
          role: nextRole,
          email,
          manager_id: managerId ? assignments.manager?.id ?? null : null,
          department_id: departmentId ? assignments.department?.id ?? null : null,
        },
      });
    }

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: employeeInclude });
    return NextResponse.json({ success: true, employee: employeeView(updated) });
  } catch (error) {
    return authErrorResponse(error);
  }
}
