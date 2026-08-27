import { prisma } from '@perzent/database';
import type { AttendanceBreak, AttendanceRecord, PunchBy } from '@prisma/client';
import { ApiError } from './auth';
import { CompanyPolicy, enforceCompanyPolicies } from './policy';
import { minutesBetween, workDateFor } from './time';

export type AttendanceWithBreak = AttendanceRecord & { breaks: AttendanceBreak[] };

export type Position = { latitude: number; longitude: number; accuracy?: number };

const OPEN_STATUSES = ['CHECKED_IN', 'ON_BREAK'] as const;
export const isOpen = (status: string) => (OPEN_STATUSES as readonly string[]).includes(status);

const withActiveBreak = { breaks: { where: { end_time: null }, orderBy: { start_time: 'desc' as const }, take: 1 } };

export async function findTodayAttendance(userId: string, timezone: string, at = new Date()): Promise<AttendanceWithBreak | null> {
  return prisma.attendanceRecord.findUnique({
    where: { user_id_work_date: { user_id: userId, work_date: workDateFor(timezone, at) } },
    include: withActiveBreak,
  });
}

export async function findOpenAttendance(userId: string): Promise<AttendanceWithBreak | null> {
  return prisma.attendanceRecord.findFirst({
    where: { user_id: userId, status: { in: [...OPEN_STATUSES] } },
    orderBy: { punch_in_time: 'desc' },
    include: withActiveBreak,
  });
}

/**
 * The record the employee is currently acting on: an open shift (even if it started on an earlier
 * local date, e.g. a night shift), otherwise today's record (possibly closed), otherwise null.
 */
export async function resolveCurrentAttendance(userId: string, policy: CompanyPolicy): Promise<AttendanceWithBreak | null> {
  await enforceCompanyPolicies(policy.id, { policy });
  const open = await findOpenAttendance(userId);
  if (open) return open;
  return findTodayAttendance(userId, policy.timezone);
}

async function recordWaypoint(record: AttendanceRecord, position: Position | undefined, at: Date) {
  if (!position) return;
  await prisma.locationWaypoint
    .create({
      data: {
        attendance_id: record.id,
        user_id: record.user_id,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy ?? 20,
        speed: 0,
        heading: 0,
        recorded_at: at,
      },
    })
    .catch(() => undefined);
}

export type CheckInArgs = {
  userId: string;
  policy: CompanyPolicy;
  by: PunchBy;
  position?: Position;
  siteId?: string | null;
};

/**
 * Starts a shift. If today's shift was already closed, it is RESUMED: the off-duty gap is recorded
 * as a break so that net worked minutes stay correct while keeping one record per local date.
 */
export async function checkIn(args: CheckInArgs): Promise<{ record: AttendanceWithBreak; resumed: boolean }> {
  const { userId, policy, by, position } = args;
  const now = new Date();
  const current = await resolveCurrentAttendance(userId, policy);

  if (current && isOpen(current.status)) {
    throw new ApiError('You already have an active shift.', 409, 'SHIFT_ACTIVE');
  }

  if (current && current.work_date.getTime() === workDateFor(policy.timezone, now).getTime()) {
    // Resume today's closed shift.
    const gapStart = current.punch_out_time || now;
    const gapMinutes = minutesBetween(gapStart, now);
    const record = await prisma.$transaction(async (tx) => {
      if (gapMinutes > 0) {
        await tx.attendanceBreak.create({
          data: {
            attendance_id: current.id,
            break_type: 'GENERAL',
            start_time: gapStart,
            end_time: now,
            duration_minutes: gapMinutes,
            ended_by: by === 'EMPLOYEE' ? 'EMPLOYEE' : 'MANAGER',
          },
        });
      }
      return tx.attendanceRecord.update({
        where: { id: current.id },
        data: {
          status: 'CHECKED_IN',
          punch_out_time: null,
          punch_out_by: null,
          punch_out_lat: null,
          punch_out_lng: null,
          punch_out_override_time: null,
          total_break_minutes: { increment: gapMinutes },
          ...(args.siteId ? { site_id: args.siteId } : {}),
        },
        include: withActiveBreak,
      });
    });
    await recordWaypoint(record, position, now);
    return { record, resumed: true };
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      user_id: userId,
      work_date: workDateFor(policy.timezone, now),
      punch_in_time: now,
      punch_in_by: by,
      punch_in_lat: position?.latitude ?? null,
      punch_in_lng: position?.longitude ?? null,
      site_id: args.siteId || null,
      status: 'CHECKED_IN',
    },
    include: withActiveBreak,
  });
  await recordWaypoint(record, position, now);
  return { record, resumed: false };
}

export async function startBreak(record: AttendanceWithBreak, breakType: 'LUNCH' | 'TEA' | 'GENERAL' = 'GENERAL') {
  if (!isOpen(record.status)) throw new ApiError('No active shift found.', 409, 'NO_ACTIVE_SHIFT');
  if (record.status === 'ON_BREAK' || record.breaks[0]) throw new ApiError('A break is already active.', 409, 'BREAK_ACTIVE');
  return prisma.$transaction(async (tx) => {
    const created = await tx.attendanceBreak.create({ data: { attendance_id: record.id, break_type: breakType } });
    await tx.attendanceRecord.update({ where: { id: record.id }, data: { status: 'ON_BREAK' } });
    return created;
  });
}

export async function endBreak(record: AttendanceWithBreak, endedBy: 'EMPLOYEE' | 'MANAGER' = 'EMPLOYEE') {
  if (!isOpen(record.status)) throw new ApiError('No active shift found.', 409, 'NO_ACTIVE_SHIFT');
  const activeBreak = record.breaks[0];
  if (!activeBreak) throw new ApiError('No active break found.', 409, 'NO_ACTIVE_BREAK');
  const end = new Date();
  const duration = minutesBetween(activeBreak.start_time, end);
  await prisma.$transaction([
    prisma.attendanceBreak.update({
      where: { id: activeBreak.id },
      data: { end_time: end, duration_minutes: duration, ended_by: endedBy },
    }),
    prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { status: 'CHECKED_IN', total_break_minutes: { increment: duration } },
    }),
  ]);
  return end;
}

export type CheckOutArgs = {
  record: AttendanceWithBreak;
  by: PunchBy;
  position?: Position;
  /** Explicit punch-out instant (manager override / auto checkout). Defaults to now. */
  at?: Date;
  overrideReason?: string;
  status?: 'CHECKED_OUT' | 'AUTO_CHECKED_OUT';
};

/** Closes a shift, folding any active break into the totals. Atomic. */
export async function checkOut(args: CheckOutArgs) {
  const { record, by, position } = args;
  if (!isOpen(record.status)) throw new ApiError('No active shift found.', 409, 'NO_ACTIVE_SHIFT');
  const end = args.at || new Date();
  if (end < record.punch_in_time) throw new ApiError('Checkout time must be after check-in.', 400, 'VALIDATION');

  return prisma.$transaction(async (tx) => {
    let breakMinutes = record.total_break_minutes;
    const activeBreak = record.breaks[0];
    if (activeBreak) {
      const breakEnd = activeBreak.start_time > end ? activeBreak.start_time : end;
      const duration = minutesBetween(activeBreak.start_time, breakEnd);
      breakMinutes += duration;
      await tx.attendanceBreak.update({
        where: { id: activeBreak.id },
        data: { end_time: breakEnd, duration_minutes: duration, ended_by: by === 'EMPLOYEE' ? 'EMPLOYEE' : 'MANAGER' },
      });
    }
    const gross = minutesBetween(record.punch_in_time, end);
    return tx.attendanceRecord.update({
      where: { id: record.id },
      data: {
        status: args.status || 'CHECKED_OUT',
        punch_out_time: end,
        punch_out_by: by,
        punch_out_lat: position?.latitude ?? null,
        punch_out_lng: position?.longitude ?? null,
        ...(args.at ? { punch_out_override_time: args.at } : {}),
        ...(args.overrideReason ? { override_reason: args.overrideReason } : {}),
        gross_worked_minutes: gross,
        total_break_minutes: breakMinutes,
        net_worked_minutes: Math.max(0, gross - breakMinutes),
      },
      include: { user: { select: { full_name: true } } },
    });
  });
}

export function attendanceSummary(record: AttendanceRecord & { user?: { full_name: string } | null }) {
  return {
    id: record.id,
    user_id: record.user_id,
    user_name: record.user?.full_name ?? '',
    work_date: record.work_date.toISOString().slice(0, 10),
    punch_in_time: record.punch_in_time.toISOString(),
    punch_out_time: record.punch_out_time?.toISOString() || null,
    punch_in_by: record.punch_in_by,
    punch_out_by: record.punch_out_by,
    punch_out_override_time: record.punch_out_override_time?.toISOString() || null,
    override_reason: record.override_reason,
    punch_in_lat: record.punch_in_lat,
    punch_in_lng: record.punch_in_lng,
    status: record.status,
    is_open: isOpen(record.status),
    gross_worked_minutes: record.gross_worked_minutes,
    total_break_minutes: record.total_break_minutes,
    net_worked_minutes: record.net_worked_minutes,
  };
}
