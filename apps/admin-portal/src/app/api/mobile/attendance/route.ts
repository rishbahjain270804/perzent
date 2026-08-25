import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const todayIst = () => {
  const istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return new Date(`${istDateStr}T00:00:00.000Z`);
};

const complianceError = (integrity: any) => {
  if (!integrity || typeof integrity !== 'object') return 'Device compliance verification is required';
  if (integrity.location_permission_granted !== true) return 'Location permission is required';
  if (integrity.location_services_enabled !== true) return 'Location Services (GPS) must be enabled';
  if (integrity.battery_power_save !== false) return 'Battery Saver / Power Saving mode must be disabled';
  if (!Number.isFinite(integrity.battery_level) || integrity.battery_level < 5) return 'Battery must be at least 5%';
  if (integrity.mock_location_detected !== false) return 'Mock/fake location apps must be disabled';
  return null;
};

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER']);
    const workDate = todayIst();
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { user_id_work_date: { user_id: session.userId, work_date: workDate } },
      include: { breaks: { where: { end_time: null }, orderBy: { start_time: 'desc' }, take: 1 } },
    });

    return NextResponse.json({
      status: attendance?.status || 'CHECKED_OUT',
      attendance_id: attendance?.id || null,
      punch_in_time: attendance?.punch_in_time ? attendance.punch_in_time.toISOString() : null,
      punch_out_time: attendance?.punch_out_time ? attendance.punch_out_time.toISOString() : null,
      active_break_started_at: attendance?.breaks[0]?.start_time ? attendance.breaks[0].start_time.toISOString() : null,
      already_completed_today: false,
      server_time: new Date().toISOString(),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER']);
    const body = await request.json();
    const workDate = todayIst();
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { user_id_work_date: { user_id: session.userId, work_date: workDate } },
      include: { breaks: { where: { end_time: null }, take: 1 } },
    });

    if (body.action === 'check_in') {
      const blockedReason = complianceError(body.integrity);
      if (blockedReason) return NextResponse.json({ error: blockedReason }, { status: 400 });
      if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) {
        return NextResponse.json({ error: 'A verified GPS position is required' }, { status: 400 });
      }

      const now = new Date();
      if (attendance) {
        if (['CHECKED_OUT', 'AUTO_CHECKED_OUT'].includes(attendance.status)) {
          const updated = await prisma.attendanceRecord.update({
            where: { id: attendance.id },
            data: {
              status: 'CHECKED_IN',
              punch_out_time: null,
              punch_out_by: null,
              punch_out_lat: null,
              punch_out_lng: null,
            },
          });
          return NextResponse.json({
            status: updated.status,
            attendance_id: updated.id,
            punch_in_time: updated.punch_in_time.toISOString(),
            server_time: now.toISOString(),
          }, { status: 200 });
        }
        return NextResponse.json({
          error: 'You already have an active shift for today.',
          status: attendance.status,
          punch_in_time: attendance.punch_in_time.toISOString(),
        }, { status: 409 });
      }

      const created = await prisma.attendanceRecord.create({
        data: {
          user_id: session.userId,
          work_date: workDate,
          punch_in_time: now,
          punch_in_lat: body.latitude,
          punch_in_lng: body.longitude,
          status: 'CHECKED_IN',
        },
      });

      // Create initial waypoint so live map has an active waypoint immediately
      await prisma.locationWaypoint.create({
        data: {
          attendance_id: created.id,
          user_id: session.userId,
          latitude: body.latitude,
          longitude: body.longitude,
          accuracy: body.accuracy || 10,
          speed: 0,
          heading: 0,
          recorded_at: now,
        },
      }).catch(() => undefined);

      return NextResponse.json({
        status: created.status,
        attendance_id: created.id,
        punch_in_time: created.punch_in_time.toISOString(),
        server_time: now.toISOString(),
      }, { status: 201 });
    }

    if (!attendance || ['CHECKED_OUT', 'AUTO_CHECKED_OUT'].includes(attendance.status)) {
      return NextResponse.json({
        error: 'No active attendance session found for today.',
        already_completed_today: Boolean(attendance),
      }, { status: 409 });
    }

    if (body.action === 'start_break') {
      if (attendance.status === 'ON_BREAK' || attendance.breaks[0]) {
        return NextResponse.json({ error: 'A break is already active' }, { status: 409 });
      }
      const item = await prisma.$transaction(async (tx: any) => {
        const created = await tx.attendanceBreak.create({ data: { attendance_id: attendance.id, break_type: 'GENERAL' } });
        await tx.attendanceRecord.update({ where: { id: attendance.id }, data: { status: 'ON_BREAK' } });
        return created;
      });
      return NextResponse.json({
        status: 'ON_BREAK',
        active_break_started_at: item.start_time.toISOString(),
        server_time: new Date().toISOString(),
      });
    }

    if (body.action === 'resume') {
      const blockedReason = complianceError(body.integrity);
      if (blockedReason) return NextResponse.json({ error: blockedReason }, { status: 400 });
      const activeBreak = attendance.breaks[0];
      if (!activeBreak) return NextResponse.json({ error: 'No active break found' }, { status: 409 });
      const end = new Date();
      const duration = Math.max(0, Math.round((end.getTime() - activeBreak.start_time.getTime()) / 60000));
      await prisma.$transaction([
        prisma.attendanceBreak.update({ where: { id: activeBreak.id }, data: { end_time: end, duration_minutes: duration, ended_by: 'EMPLOYEE' } }),
        prisma.attendanceRecord.update({
          where: { id: attendance.id },
          data: { status: 'CHECKED_IN', total_break_minutes: { increment: duration } },
        }),
      ]);
      return NextResponse.json({
        status: 'CHECKED_IN',
        server_time: end.toISOString(),
      });
    }

    if (body.action === 'check_out') {
      if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) {
        return NextResponse.json({ error: 'A verified GPS position is required' }, { status: 400 });
      }
      const end = new Date();
      let breakMinutes = attendance.total_break_minutes;
      const activeBreak = attendance.breaks[0];
      if (activeBreak) {
        const duration = Math.max(0, Math.round((end.getTime() - activeBreak.start_time.getTime()) / 60000));
        breakMinutes += duration;
        await prisma.attendanceBreak.update({
          where: { id: activeBreak.id },
          data: { end_time: end, duration_minutes: duration, ended_by: 'EMPLOYEE' },
        });
      }
      const gross = Math.max(0, Math.round((end.getTime() - attendance.punch_in_time.getTime()) / 60000));
      await prisma.attendanceRecord.update({
        where: { id: attendance.id },
        data: {
          status: 'CHECKED_OUT',
          punch_out_time: end,
          punch_out_by: 'EMPLOYEE',
          punch_out_lat: body.latitude,
          punch_out_lng: body.longitude,
          gross_worked_minutes: gross,
          total_break_minutes: breakMinutes,
          net_worked_minutes: Math.max(0, gross - breakMinutes),
        },
      });
      return NextResponse.json({
        status: 'CHECKED_OUT',
        punch_out_time: end.toISOString(),
        server_time: end.toISOString(),
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE', 'MANAGER']);
    const body = await request.json();
    const telemetry = body.telemetry && typeof body.telemetry === 'object' ? body.telemetry : body;
    const device = body.device && typeof body.device === 'object' ? body.device : null;
    await prisma.userDevice.updateMany({
      where: { user_id: session.userId, is_active: true },
      data: {
        telemetry,
        last_seen_at: new Date(),
        ...(device?.device_model ? { device_model: String(device.device_model).slice(0, 160) } : {}),
        ...(device?.os_version ? { os_version: String(device.os_version).slice(0, 80) } : {}),
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
