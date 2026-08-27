import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { DeviceInfoSchema, DeviceTelemetrySchema, MobileAttendanceActionSchema, type IntegrityDto } from '@perzent/shared-types';
import { checkIn, checkOut, endBreak, isOpen, resolveCurrentAttendance, startBreak, type AttendanceWithBreak } from '@/lib/attendance';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { getCompanyPolicy, type CompanyPolicy } from '@/lib/policy';
import { workDateFor } from '@/lib/time';

export const dynamic = 'force-dynamic';

const complianceError = (integrity: IntegrityDto) => {
  if (!integrity.location_permission_granted) return 'Location permission is required';
  if (!integrity.location_services_enabled) return 'Location Services (GPS) must be enabled';
  if (integrity.battery_power_save) return 'Battery Saver / Power Saving mode must be disabled';
  if (integrity.battery_level < 5) return 'Battery must be at least 5%';
  if (integrity.mock_location_detected) return 'Mock/fake location apps must be disabled';
  return null;
};

function statePayload(record: AttendanceWithBreak | null, policy: CompanyPolicy, extra: Record<string, unknown> = {}) {
  const now = new Date();
  const todayWorkDate = workDateFor(policy.timezone, now).getTime();
  const isToday = record ? record.work_date.getTime() === todayWorkDate : false;
  return {
    status: record?.status || 'CHECKED_OUT',
    attendance_id: record?.id || null,
    work_date: record ? record.work_date.toISOString().slice(0, 10) : null,
    punch_in_time: record?.punch_in_time.toISOString() || null,
    punch_out_time: record?.punch_out_time?.toISOString() || null,
    active_break_started_at: record?.breaks[0]?.start_time.toISOString() || null,
    already_completed_today: Boolean(record && isToday && !isOpen(record.status)),
    total_break_minutes: record?.total_break_minutes ?? 0,
    net_worked_minutes: record?.net_worked_minutes ?? 0,
    server_time: now.toISOString(),
    policy: {
      timezone: policy.timezone,
      auto_checkout_time: policy.auto_checkout_time,
      max_break_minutes: policy.max_break_minutes,
    },
    ...extra,
  };
}

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER']);
    const policy = await getCompanyPolicy(session.companyId);
    const record = await resolveCurrentAttendance(session.userId, policy);
    return NextResponse.json(statePayload(record, policy));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER']);
    const body = MobileAttendanceActionSchema.parse(await request.json());
    const policy = await getCompanyPolicy(session.companyId);

    if (body.action === 'check_in') {
      const blocked = complianceError(body.integrity);
      if (blocked) return jsonError(blocked, 400, 'COMPLIANCE');
      const { record, resumed } = await checkIn({
        userId: session.userId,
        policy,
        by: 'EMPLOYEE',
        position: { latitude: body.latitude, longitude: body.longitude, accuracy: body.accuracy },
      });
      return NextResponse.json(statePayload(record, policy, { resumed }), { status: resumed ? 200 : 201 });
    }

    const current = await resolveCurrentAttendance(session.userId, policy);
    if (!current || !isOpen(current.status)) {
      return NextResponse.json(
        { error: 'No active shift found.', code: 'NO_ACTIVE_SHIFT', ...statePayload(current, policy) },
        { status: 409 }
      );
    }

    if (body.action === 'start_break') {
      const created = await startBreak(current, body.break_type || 'GENERAL');
      return NextResponse.json(statePayload({ ...current, status: 'ON_BREAK', breaks: [created] }, policy));
    }

    if (body.action === 'resume') {
      const blocked = complianceError(body.integrity);
      if (blocked) return jsonError(blocked, 400, 'COMPLIANCE');
      await endBreak(current, 'EMPLOYEE');
      const refreshed = await resolveCurrentAttendance(session.userId, policy);
      return NextResponse.json(statePayload(refreshed, policy));
    }

    // check_out
    const updated = await checkOut({
      record: current,
      by: 'EMPLOYEE',
      position: { latitude: body.latitude, longitude: body.longitude, accuracy: body.accuracy },
    });
    return NextResponse.json(statePayload({ ...updated, breaks: [] }, policy));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER']);
    const body = await request.json();
    const telemetry = DeviceTelemetrySchema.parse(body?.telemetry && typeof body.telemetry === 'object' ? body.telemetry : body);
    const device = DeviceInfoSchema.parse(body?.device && typeof body.device === 'object' ? body.device : {});

    await prisma.userDevice.updateMany({
      where: { user_id: session.userId, is_active: true },
      data: {
        telemetry: { ...telemetry, updated_at: new Date().toISOString() },
        last_seen_at: new Date(),
        ...(device.device_model ? { device_model: device.device_model } : {}),
        ...(device.os_version ? { os_version: device.os_version } : {}),
      },
    });

    if (telemetry.mock_location_detected) {
      const recent = await prisma.tamperLog.findFirst({
        where: { user_id: session.userId, event_type: 'MOCK_LOCATION_DETECTED', occurred_at: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
      });
      if (!recent) {
        const open = await prisma.attendanceRecord.findFirst({
          where: { user_id: session.userId, status: { in: ['CHECKED_IN', 'ON_BREAK'] } },
          select: { id: true },
        });
        await prisma.tamperLog.create({
          data: {
            user_id: session.userId,
            attendance_id: open?.id ?? null,
            event_type: 'MOCK_LOCATION_DETECTED',
            details: 'Mock/fake location app detected on device',
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
