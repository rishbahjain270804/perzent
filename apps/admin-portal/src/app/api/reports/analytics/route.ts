import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);

    const [users, attendanceRecords, leaveRecords] = await Promise.all([
      prisma.user.findMany({
        where: {
          company_id: session.companyId,
          role: { not: 'OWNER' },
          status: 'ACTIVE',
          ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
        },
        select: { id: true, full_name: true, department: { select: { name: true } } },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          user: {
            company_id: session.companyId,
            ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
          },
          work_date: { gte: cutoffDate },
        },
        include: {
          user: { select: { id: true, full_name: true, department: { select: { name: true } } } },
        },
        orderBy: { work_date: 'asc' },
      }),
      prisma.leaveRequest.findMany({
        where: {
          company_id: session.companyId,
          status: 'APPROVED',
          start_date: { gte: cutoffDate },
          ...(session.role === 'MANAGER' ? { user: { manager_id: session.userId } } : {}),
        },
      }),
    ]);

    let onTimeCount = 0;
    let lateClockInCount = 0;
    let totalGrossMinutes = 0;
    let totalNetMinutes = 0;
    let totalBreakMinutes = 0;

    const departmentStats: Record<string, { name: string; total_hours: number; punches: number; late_punches: number }> = {};

    for (const record of attendanceRecords) {
      totalGrossMinutes += record.gross_worked_minutes;
      totalNetMinutes += record.net_worked_minutes;
      totalBreakMinutes += record.total_break_minutes;

      // Late clock-in check (IST 9:30 AM threshold: 04:00 UTC)
      const punchDate = new Date(record.punch_in_time);
      const istHours = (punchDate.getUTCHours() + 5 + Math.floor((punchDate.getUTCMinutes() + 30) / 60)) % 24;
      const istMinutes = (punchDate.getUTCMinutes() + 30) % 60;
      const isLate = (istHours > 9 || (istHours === 9 && istMinutes > 30));

      if (isLate) {
        lateClockInCount++;
      } else {
        onTimeCount++;
      }

      const deptName = record.user.department?.name || 'Unassigned';
      if (!departmentStats[deptName]) {
        departmentStats[deptName] = { name: deptName, total_hours: 0, punches: 0, late_punches: 0 };
      }
      departmentStats[deptName].total_hours += Number((record.net_worked_minutes / 60).toFixed(2));
      departmentStats[deptName].punches += 1;
      if (isLate) departmentStats[deptName].late_punches += 1;
    }

    const totalPunches = attendanceRecords.length;
    const punctualityRate = totalPunches > 0 ? Math.round((onTimeCount / totalPunches) * 100) : 100;

    return NextResponse.json({
      period_days: days,
      total_employees: users.length,
      total_shifts_completed: totalPunches,
      punctuality_rate_percentage: punctualityRate,
      on_time_shifts: onTimeCount,
      late_shifts: lateClockInCount,
      total_approved_leaves: leaveRecords.length,
      total_hours_worked: Number((totalNetMinutes / 60).toFixed(1)),
      total_break_hours: Number((totalBreakMinutes / 60).toFixed(1)),
      average_shift_hours: totalPunches > 0 ? Number((totalNetMinutes / (totalPunches * 60)).toFixed(1)) : 0,
      department_breakdown: Object.values(departmentStats),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
