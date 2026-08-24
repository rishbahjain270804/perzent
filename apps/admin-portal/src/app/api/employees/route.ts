import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@perzent/database';
import { ProvisionEmployeeSchema } from '@perzent/shared-types';
import { authErrorResponse, requireSession } from '@/lib/auth';

const employeeView = (user: any) => ({
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
  manager_name: user.manager?.full_name || 'None',
  department_name: user.department?.name || 'Unassigned',
  device_info: user.devices?.[0]
    ? `${user.devices[0].device_model || 'Unknown'} (${user.devices[0].os_version || 'Unknown'})`
    : 'No Device Bound',
  device_uuid: user.devices?.[0]?.device_uuid,
  is_device_bound: Boolean(user.devices?.[0]),
  created_at: user.created_at?.toISOString(),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const users = await prisma.user.findMany({
      where: {
        company_id: session.companyId,
        role: { not: 'OWNER' },
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
      },
      include: {
        manager: { select: { full_name: true } },
        department: { select: { name: true } },
        devices: { where: { is_active: true }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(users.map(employeeView));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const parsed = ProvisionEmployeeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { company_id: session.companyId, phone: parsed.data.phone },
    });
    if (existing) {
      return NextResponse.json({ error: 'An employee with this phone number already exists.' }, { status: 409 });
    }

    const [department, manager] = await Promise.all([
      parsed.data.department_id
        ? prisma.department.findFirst({ where: { id: parsed.data.department_id, company_id: session.companyId } })
        : prisma.department.findFirst({ where: { company_id: session.companyId }, orderBy: { created_at: 'asc' } }),
      parsed.data.manager_id
        ? prisma.user.findFirst({ where: { id: parsed.data.manager_id, company_id: session.companyId, role: { in: ['OWNER', 'MANAGER'] } } })
        : Promise.resolve(null),
    ]);
    if (parsed.data.department_id && !department) {
      return NextResponse.json({ error: 'Department does not belong to this company' }, { status: 400 });
    }
    if (parsed.data.manager_id && !manager) {
      return NextResponse.json({ error: 'Manager does not belong to this company' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        company_id: session.companyId,
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        email: parsed.data.email?.toLowerCase() || null,
        password_hash: await hash(parsed.data.password, 12),
        designation: parsed.data.designation,
        role: parsed.data.role,
        department_id: department?.id,
        manager_id: manager?.id,
      },
      include: {
        manager: { select: { full_name: true } },
        department: { select: { name: true } },
        devices: { where: { is_active: true } },
      },
    });
    return NextResponse.json(employeeView(user), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const body = await request.json();
    if (body.action !== 'RESET_DEVICE' || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    const user = await prisma.user.findFirst({
      where: {
        id: body.id,
        company_id: session.companyId,
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
      },
    });
    if (!user) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    await prisma.userDevice.updateMany({
      where: { user_id: user.id, is_active: true },
      data: { is_active: false },
    });
    return NextResponse.json({ success: true, message: 'Device binding successfully reset.' });
  } catch (error) {
    return authErrorResponse(error);
  }
}
