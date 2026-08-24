import { NextResponse } from 'next/server';
import { getStore } from '@perzent/database';
import { ProvisionEmployeeSchema } from '@perzent/shared-types';

export async function GET() {
  const store = getStore();
  const employees = store.users.map((u) => {
    const manager = store.users.find((m) => m.id === u.manager_id);
    const department = store.departments.find((d) => d.id === u.department_id);
    const device = store.userDevices.find((d) => d.user_id === u.id && d.is_active);
    return {
      ...u,
      manager_name: manager ? manager.full_name : 'None',
      department_name: department ? department.name : 'Unassigned',
      device_info: device ? `${device.device_model} (${device.os_version})` : 'No Device Bound',
      is_device_bound: !!device,
    };
  });
  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = getStore();

    if (body.action === 'reset_device') {
      const { user_id } = body;
      const device = store.userDevices.find((d) => d.user_id === user_id && d.is_active);
      if (device) {
        device.is_active = false;
      }
      return NextResponse.json({ success: true, message: 'Device binding successfully reset.' });
    }

    // Add employee
    const parsed = ProvisionEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = store.users.find((u) => u.phone === parsed.data.phone);
    if (existing) {
      return NextResponse.json({ error: 'An employee with this phone number already exists.' }, { status: 409 });
    }

    const newEmp = {
      id: `user-${Date.now()}`,
      company_id: 'comp-acme-1001',
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      password: parsed.data.password,
      designation: parsed.data.designation,
      role: parsed.data.role || 'EMPLOYEE',
      department_id: parsed.data.department_id || 'dept-north-sales',
      manager_id: parsed.data.manager_id || undefined,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    store.users.push(newEmp);
    return NextResponse.json(newEmp, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
