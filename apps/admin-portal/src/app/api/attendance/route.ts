import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { AttendanceActionSchema, DATE_ONLY_REGEX } from '@perzent/shared-types';
import { attendanceSummary, checkOut, findOpenAttendance, isOpen } from '@/lib/attendance';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { enforceCompanyPolicies, getCompanyPolicy } from '@/lib/policy';
import { addDays, localDateString, localTimeString, workDateFromString, workDateToString, zonedTimeToUtc } from '@/lib/time';

export const dynamic = 'force-dynamic';

const parseDateParam = (value: string | null): Date | null => {
  if (!value) return null;
  if (!DATE_ONLY_REGEX.test(value)) throw new Error('invalid');
  const date = workDateFromString(value);
  if (Number.isNaN(date.getTime())) throw new Error('invalid');
  return date;
};

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const policy = await getCompanyPolicy(session.companyId);
    await enforceCompanyPolicies(policy.id, { policy });

    const { searchParams } = new URL(request.url);
    let from: Date | null;
    let to: Date | null;
    try {
      from = parseDateParam(searchParams.get('from'));
      to = parseDateParam(searchParams.get('to'));
    } catch {
      return jsonError('Dates must be YYYY-MM-DD', 400, 'VALIDATION');
    }
    const userId = searchParams.get('user_id');
    if (!from && !to) {
      to = workDateFromString(localDateString(policy.timezone));
      from = addDays(to, -31);
    }
    if (from && to && from > to) return jsonError('"from" must be on or before "to"', 400, 'VALIDATION');

    const records = await prisma.attendanceRecord.findMany({
      where: {
        user: {
          company_id: session.companyId,
          ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
        },
        ...(userId ? { user_id: userId } : {}),
        ...(from || to ? { work_date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { user: { select: { full_name: true } } },
      orderBy: [{ work_date: 'desc' }, { punch_in_time: 'desc' }],
      take: 2000,
    });
    return NextResponse.json(records.map(attendanceSummary));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const body = AttendanceActionSchema.parse(await request.json());
    const policy = await getCompanyPolicy(session.companyId);
    const punchBy = session.role === 'OWNER' ? 'OWNER' : 'MANAGER';
    const scope = session.role === 'MANAGER' ? { manager_id: session.userId } : {};

    if (body.action === 'force_checkout') {
      const record = await prisma.attendanceRecord.findFirst({
        where: { id: body.attendance_id, user: { company_id: session.companyId, ...scope } },
        include: { breaks: { where: { end_time: null }, orderBy: { start_time: 'desc' }, take: 1 } },
      });
      if (!record) return jsonError('Attendance session not found', 404, 'NOT_FOUND');
      if (!isOpen(record.status)) return jsonError('Attendance session is already closed', 409, 'CONFLICT');

      const now = new Date();
      let at: Date | undefined;
      if (body.override_time) {
        at = zonedTimeToUtc(workDateToString(record.work_date), body.override_time, policy.timezone);
        if (at < record.punch_in_time) at = addDays(at, 1); // overnight shift
        if (at > now) return jsonError('Checkout time cannot be in the future', 400, 'VALIDATION');
        if (at < record.punch_in_time) return jsonError('Checkout time must be after check-in', 400, 'VALIDATION');
      }
      const updated = await checkOut({ record, by: punchBy, at, overrideReason: body.reason });
      return NextResponse.json({ success: true, message: 'Employee checked out.', record: attendanceSummary(updated) });
    }

    // manual_checkin
    const user = await prisma.user.findFirst({
      where: { id: body.user_id, company_id: session.companyId, role: { in: ['EMPLOYEE', 'MANAGER'] }, status: 'ACTIVE', ...scope },
    });
    if (!user) return jsonError('Employee not found', 404, 'NOT_FOUND');

    const now = new Date();
    const dateStr = body.work_date || localDateString(policy.timezone, now);
    const timeStr = body.check_in_time || localTimeString(policy.timezone, now);
    const checkInTime = zonedTimeToUtc(dateStr, timeStr, policy.timezone);
    if (Number.isNaN(checkInTime.getTime())) return jsonError('Invalid check-in date/time', 400, 'VALIDATION');
    if (checkInTime > now) return jsonError('Check-in time cannot be in the future', 400, 'VALIDATION');

    const open = await findOpenAttendance(user.id);
    if (open) return jsonError('Employee already has an open shift. Check them out first.', 409, 'SHIFT_ACTIVE');
    const workDate = workDateFromString(dateStr);
    const existing = await prisma.attendanceRecord.findUnique({ where: { user_id_work_date: { user_id: user.id, work_date: workDate } } });
    if (existing) return jsonError('Employee already has attendance for this date', 409, 'CONFLICT');

    const record = await prisma.attendanceRecord.create({
      data: {
        user_id: user.id,
        work_date: workDate,
        punch_in_time: checkInTime,
        punch_in_by: punchBy,
        override_reason: body.reason,
      },
      include: { user: { select: { full_name: true } } },
    });
    return NextResponse.json({ success: true, message: 'Manual check-in created.', record: attendanceSummary(record) }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
