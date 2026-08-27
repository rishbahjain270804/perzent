import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { enforceCompanyPolicies, getCompanyPolicy } from '@/lib/policy';
import { addDays, localMinutesOfDay, workDateFor } from '@/lib/time';

export const dynamic = 'force-dynamic';

const ALLOWED_WINDOWS = [7, 30, 90];
const LATE_THRESHOLD_MINUTES = 9 * 60 + 30; // 09:30 company time

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const policy = await getCompanyPolicy(session.companyId);
    await enforceCompanyPolicies(policy.id, { policy });

    const daysParam = parseInt(new URL(request.url).searchParams.get('days') || '30', 10);
    if (!ALLOWED_WINDOWS.includes(daysParam)) return jsonError('days must be 7, 30 or 90', 400, 'VALIDATION');
    const cutoff = workDateFor(policy.timezone, addDays(new Date(), -daysParam));
    const scope = session.role === 'MANAGER' ? { manager_id: session.userId } : {};

    const [users, records, leaves] = await Promise.all([
      prisma.user.findMany({
        where: { company_id: session.companyId, role: { not: 'OWNER' }, status: 'ACTIVE', ...scope },
        select: { id: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { user: { company_id: session.companyId, ...scope }, work_date: { gte: cutoff } },
        include: { user: { select: { department: { select: { name: true } } } } },
      }),
      prisma.leaveRequest.count({
        where: {
          company_id: session.companyId,
          status: 'APPROVED',
          start_date: { gte: cutoff },
          ...(session.role === 'MANAGER' ? { user: { manager_id: session.userId } } : {}),
        },
      }),
    ]);

    let onTime = 0;
    let late = 0;
    let completed = 0;
    let netMinutes = 0;
    let breakMinutes = 0;
    let grossMinutes = 0;
    const departments: Record<string, { name: string; total_minutes: number; punches: number; late_punches: number }> = {};

    for (const record of records) {
      const isClosed = record.status === 'CHECKED_OUT' || record.status === 'AUTO_CHECKED_OUT';
      const isLate = record.punch_in_by === 'EMPLOYEE' || record.punch_in_by === 'KIOSK'
        ? localMinutesOfDay(policy.timezone, record.punch_in_time) > LATE_THRESHOLD_MINUTES
        : false;
      if (isLate) late += 1;
      else onTime += 1;

      const dept = record.user.department?.name || 'Unassigned';
      departments[dept] ||= { name: dept, total_minutes: 0, punches: 0, late_punches: 0 };
      departments[dept].punches += 1;
      if (isLate) departments[dept].late_punches += 1;

      if (isClosed) {
        completed += 1;
        netMinutes += record.net_worked_minutes;
        breakMinutes += record.total_break_minutes;
        grossMinutes += record.gross_worked_minutes;
        departments[dept].total_minutes += record.net_worked_minutes;
      }
    }

    const punches = records.length;
    return NextResponse.json({
      period_days: daysParam,
      timezone: policy.timezone,
      late_after: '09:30',
      total_employees: users.length,
      total_shifts: punches,
      total_shifts_completed: completed,
      open_shifts: punches - completed,
      punctuality_rate_percentage: punches > 0 ? Math.round((onTime / punches) * 100) : 100,
      on_time_shifts: onTime,
      late_shifts: late,
      total_approved_leaves: leaves,
      total_hours_worked: Number((netMinutes / 60).toFixed(1)),
      total_gross_hours: Number((grossMinutes / 60).toFixed(1)),
      total_break_hours: Number((breakMinutes / 60).toFixed(1)),
      average_shift_hours: completed > 0 ? Number((netMinutes / (completed * 60)).toFixed(1)) : 0,
      department_breakdown: Object.values(departments).map((dept) => ({
        name: dept.name,
        total_hours: Number((dept.total_minutes / 60).toFixed(1)),
        punches: dept.punches,
        late_punches: dept.late_punches,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
