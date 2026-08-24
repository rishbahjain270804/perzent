import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

const todayUtc = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE']);
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { user_id_work_date: { user_id: session.userId, work_date: todayUtc() } },
      include: { breaks: { where: { end_time: null }, orderBy: { start_time: 'desc' }, take: 1 } },
    });
    return NextResponse.json({
      status: attendance?.status || 'CHECKED_OUT',
      attendance_id: attendance?.id,
      punch_in_time: attendance?.punch_in_time.toISOString(),
      active_break_started_at: attendance?.breaks[0]?.start_time.toISOString(),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE']);
    const body = await request.json();
    const workDate = todayUtc();
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { user_id_work_date: { user_id: session.userId, work_date: workDate } },
      include: { breaks: { where: { end_time: null }, take: 1 } },
    });

    if (body.action === 'check_in') {
      if (attendance) return NextResponse.json({ error: 'Attendance already exists for today' }, { status: 409 });
      if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) {
        return NextResponse.json({ error: 'A verified GPS position is required' }, { status: 400 });
      }
      const created = await prisma.attendanceRecord.create({
        data: {
          user_id: session.userId,
          work_date: workDate,
          punch_in_time: new Date(),
          punch_in_lat: body.latitude,
          punch_in_lng: body.longitude,
        },
      });
      return NextResponse.json({ status: created.status, attendance_id: created.id, punch_in_time: created.punch_in_time.toISOString() }, { status: 201 });
    }
    if (!attendance || ['CHECKED_OUT', 'AUTO_CHECKED_OUT'].includes(attendance.status)) {
      return NextResponse.json({ error: 'No active attendance session' }, { status: 409 });
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
      return NextResponse.json({ status: 'ON_BREAK', active_break_started_at: item.start_time.toISOString() });
    }

    if (body.action === 'resume') {
      const activeBreak = attendance.breaks[0];
      if (!activeBreak) return NextResponse.json({ error: 'No active break' }, { status: 409 });
      const end = new Date();
      const duration = Math.max(0, Math.round((end.getTime() - activeBreak.start_time.getTime()) / 60000));
      await prisma.$transaction([
        prisma.attendanceBreak.update({ where: { id: activeBreak.id }, data: { end_time: end, duration_minutes: duration, ended_by: 'EMPLOYEE' } }),
        prisma.attendanceRecord.update({
          where: { id: attendance.id },
          data: { status: 'CHECKED_IN', total_break_minutes: { increment: duration } },
        }),
      ]);
      return NextResponse.json({ status: 'CHECKED_IN' });
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
      return NextResponse.json({ status: 'CHECKED_OUT' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['EMPLOYEE']);
    const telemetry = await request.json();
    await prisma.userDevice.updateMany({
      where: { user_id: session.userId, is_active: true },
      data: { telemetry, last_seen_at: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
