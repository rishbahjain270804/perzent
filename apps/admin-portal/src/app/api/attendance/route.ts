import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

const summary = (record: any) => ({
  id: record.id,
  user_id: record.user_id,
  user_name: record.user.full_name,
  work_date: record.work_date.toISOString().slice(0, 10),
  punch_in_time: record.punch_in_time.toISOString(),
  punch_out_time: record.punch_out_time?.toISOString() || null,
  punch_in_by: record.punch_in_by,
  punch_out_by: record.punch_out_by,
  punch_out_override_time: record.punch_out_override_time?.toISOString() || null,
  override_reason: record.override_reason,
  status: record.status,
  gross_worked_minutes: record.gross_worked_minutes,
  total_break_minutes: record.total_break_minutes,
  net_worked_minutes: record.net_worked_minutes,
});

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const records = await prisma.attendanceRecord.findMany({
      where: {
        user: {
          company_id: session.companyId,
          ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
        },
      },
      include: { user: { select: { full_name: true } } },
      orderBy: [{ work_date: 'desc' }, { punch_in_time: 'desc' }],
      take: 1000,
    });
    return NextResponse.json(records.map(summary));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const body = await request.json();

    if (body.action === 'force_checkout') {
      if (!body.attendance_id || !body.reason?.trim()) {
        return NextResponse.json({ error: 'Attendance record and reason are required' }, { status: 400 });
      }
      const record = await prisma.attendanceRecord.findFirst({
        where: {
          id: body.attendance_id,
          user: {
            company_id: session.companyId,
            ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
          },
        },
      });
      if (!record) return NextResponse.json({ error: 'Attendance session not found' }, { status: 404 });
      if (['CHECKED_OUT', 'AUTO_CHECKED_OUT'].includes(record.status)) {
        return NextResponse.json({ error: 'Attendance session is already closed' }, { status: 409 });
      }

      const override = body.override_time
        ? new Date(`${record.work_date.toISOString().slice(0, 10)}T${body.override_time}:00+05:30`)
        : new Date();
      if (Number.isNaN(override.getTime()) || override < record.punch_in_time) {
        return NextResponse.json({ error: 'Checkout time must be after check-in' }, { status: 400 });
      }
      const gross = Math.max(0, Math.round((override.getTime() - record.punch_in_time.getTime()) / 60000));
      const updated = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          punch_out_time: override,
          punch_out_by: session.role === 'OWNER' ? 'OWNER' : 'MANAGER',
          punch_out_override_time: override,
          override_reason: body.reason.trim(),
          status: 'CHECKED_OUT',
          gross_worked_minutes: gross,
          net_worked_minutes: Math.max(0, gross - record.total_break_minutes),
        },
        include: { user: { select: { full_name: true } } },
      });
      return NextResponse.json({ success: true, message: 'Employee checked out.', record: summary(updated) });
    }

    if (body.action === 'manual_checkin') {
      if (!body.user_id || !body.reason?.trim()) {
        return NextResponse.json({ error: 'Employee and reason are required' }, { status: 400 });
      }
      const user = await prisma.user.findFirst({
        where: {
          id: body.user_id,
          company_id: session.companyId,
          role: { in: ['EMPLOYEE', 'MANAGER'] },
          ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
        },
      });
      if (!user) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

      const checkIn = body.check_in_time ? new Date(body.check_in_time) : new Date();
      if (Number.isNaN(checkIn.getTime())) {
        return NextResponse.json({ error: 'Invalid check-in time' }, { status: 400 });
      }
      const workDate = new Date(`${checkIn.toISOString().slice(0, 10)}T00:00:00.000Z`);
      const existing = await prisma.attendanceRecord.findUnique({
        where: { user_id_work_date: { user_id: user.id, work_date: workDate } },
      });
      if (existing) return NextResponse.json({ error: 'Employee already has attendance for this date' }, { status: 409 });

      const record = await prisma.attendanceRecord.create({
        data: {
          user_id: user.id,
          work_date: workDate,
          punch_in_time: checkIn,
          punch_in_by: session.role === 'OWNER' ? 'OWNER' : 'MANAGER',
          override_reason: body.reason.trim(),
        },
        include: { user: { select: { full_name: true } } },
      });
      return NextResponse.json({ success: true, message: 'Manual check-in created.', record: summary(record) }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
