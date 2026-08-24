import { NextResponse } from 'next/server';
import { getStore } from '@perzent/database';
import { RegisterCompanySchema, LoginSchema } from '@perzent/shared-types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = getStore();

    if (body.action === 'register') {
      const parsed = RegisterCompanySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const existing = store.companies.find((c) => c.owner_email === parsed.data.email);
      if (existing) {
        return NextResponse.json({ error: 'Company email already registered' }, { status: 409 });
      }

      const companyId = `comp-${Date.now()}`;
      const ownerId = `user-${Date.now()}`;

      const newCompany = {
        id: companyId,
        name: parsed.data.company_name,
        owner_email: parsed.data.email,
        timezone: parsed.data.timezone || 'Asia/Kolkata',
        auto_checkout_time: '23:40',
        max_break_minutes: 30,
        route_retention_days: 15,
        attendance_retention_days: 45,
        plan_tier: 'FREE',
        created_at: new Date().toISOString(),
      };

      const newOwner = {
        id: ownerId,
        company_id: companyId,
        full_name: parsed.data.owner_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        password: parsed.data.password,
        role: 'OWNER',
        designation: 'Business Owner & Superadmin',
        status: 'ACTIVE',
      };

      store.companies.push(newCompany);
      store.users.push(newOwner);

      return NextResponse.json({
        user_id: ownerId,
        company_id: companyId,
        role: 'OWNER',
        full_name: newOwner.full_name,
        email: newOwner.email,
        token: `token-jwt-${ownerId}`,
      });
    }

    // Default: Login
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const user = store.users.find(
      (u) =>
        (u.phone === parsed.data.phone_or_email || u.email === parsed.data.phone_or_email) &&
        u.password === parsed.data.password
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid phone/email or password' }, { status: 401 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is inactive. Please contact administration.' }, { status: 403 });
    }

    // Device binding check for Mobile Employee login
    if (parsed.data.device_uuid) {
      const existingDevice = store.userDevices.find((d) => d.user_id === user.id && d.is_active);
      if (existingDevice && existingDevice.device_uuid !== parsed.data.device_uuid) {
        return NextResponse.json(
          { error: 'Device mismatch. Account is bound to another phone. Contact your manager to reset.' },
          { status: 403 }
        );
      }

      if (!existingDevice) {
        store.userDevices.push({
          id: `dev-${Date.now()}`,
          user_id: user.id,
          device_uuid: parsed.data.device_uuid,
          device_model: parsed.data.device_model || 'Unknown',
          os_version: parsed.data.os_version || 'Unknown',
          is_active: true,
          last_seen_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      user_id: user.id,
      company_id: user.company_id,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      department_id: user.department_id,
      manager_id: user.manager_id,
      token: `token-jwt-${user.id}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
