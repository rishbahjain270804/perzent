import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { DATE_ONLY_REGEX } from '@perzent/shared-types';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { getCompanyPolicy } from '@/lib/policy';
import { addDays, localDateString, localTimeString, workDateFromString } from '@/lib/time';

export const dynamic = 'force-dynamic';

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formula injection and escape quotes.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const policy = await getCompanyPolicy(session.companyId);

    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get('start_date') || localDateString(policy.timezone, addDays(new Date(), -31));
    const endStr = searchParams.get('end_date') || localDateString(policy.timezone);
    const userId = searchParams.get('user_id');
    const departmentId = searchParams.get('department_id');
    const format = searchParams.get('format');
    if (!DATE_ONLY_REGEX.test(startStr) || !DATE_ONLY_REGEX.test(endStr)) return jsonError('Dates must be YYYY-MM-DD', 400, 'VALIDATION');
    const start = workDateFromString(startStr);
    const end = workDateFromString(endStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return jsonError('Invalid date range', 400, 'VALIDATION');
    if (end.getTime() - start.getTime() > 186 * 86400000) return jsonError('Date range is limited to 6 months', 400, 'VALIDATION');

    const standardDailyMinutes = Math.round(policy.standard_daily_hours * 60);
    const records = await prisma.attendanceRecord.findMany({
      where: {
        user: {
          company_id: session.companyId,
          ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
          ...(departmentId ? { department_id: departmentId } : {}),
        },
        ...(userId ? { user_id: userId } : {}),
        work_date: { gte: start, lte: end },
      },
      include: {
        user: { select: { id: true, full_name: true, phone: true, designation: true, department: { select: { name: true } } } },
        site: { select: { name: true } },
      },
      orderBy: [{ work_date: 'desc' }, { punch_in_time: 'asc' }],
      take: 5000,
    });

    const rows = records.map((record) => {
      const isClosed = record.status === 'CHECKED_OUT' || record.status === 'AUTO_CHECKED_OUT';
      const netMinutes = isClosed ? record.net_worked_minutes : 0;
      const overtimeMinutes = Math.max(0, netMinutes - standardDailyMinutes);
      const regularMinutes = Math.min(netMinutes, standardDailyMinutes);
      return {
        id: record.id,
        user_id: record.user.id,
        user_name: record.user.full_name,
        phone: record.user.phone,
        department: record.user.department?.name || 'Unassigned',
        designation: record.user.designation,
        site_name: record.site?.name || 'Field / Remote',
        work_date: record.work_date.toISOString().slice(0, 10),
        punch_in: record.punch_in_time.toISOString(),
        punch_out: record.punch_out_time?.toISOString() || null,
        punch_in_local: localTimeString(policy.timezone, record.punch_in_time),
        punch_out_local: record.punch_out_time ? localTimeString(policy.timezone, record.punch_out_time) : null,
        status: record.status,
        is_open: !isClosed,
        gross_hours: Number(((isClosed ? record.gross_worked_minutes : 0) / 60).toFixed(2)),
        break_hours: Number(((isClosed ? record.total_break_minutes : 0) / 60).toFixed(2)),
        net_hours: Number((netMinutes / 60).toFixed(2)),
        regular_hours: Number((regularMinutes / 60).toFixed(2)),
        overtime_hours: Number((overtimeMinutes / 60).toFixed(2)),
      };
    });

    if (format === 'csv') {
      const headers = [
        'Employee Name', 'Phone', 'Department', 'Designation', 'Date', 'Shift Status',
        `Punch In (${policy.timezone})`, `Punch Out (${policy.timezone})`,
        'Gross Hours', 'Break Hours', 'Net Worked Hours', 'Regular Hours', 'Overtime Hours', 'Site / Location',
      ];
      const lines = [headers.map(csvCell).join(',')];
      for (const row of rows) {
        lines.push([
          csvCell(row.user_name), csvCell(row.phone), csvCell(row.department), csvCell(row.designation), csvCell(row.work_date),
          csvCell(row.status), csvCell(row.punch_in_local), csvCell(row.punch_out_local || ''),
          row.gross_hours, row.break_hours, row.net_hours, row.regular_hours, row.overtime_hours, csvCell(row.site_name),
        ].join(','));
      }
      return new NextResponse(`﻿${lines.join('\r\n')}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="perzent-timesheets-${startStr}-to-${endStr}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({
      timezone: policy.timezone,
      standard_daily_hours: policy.standard_daily_hours,
      start_date: startStr,
      end_date: endStr,
      total_records: rows.length,
      open_records: rows.filter((row) => row.is_open).length,
      total_net_hours: Number(rows.reduce((sum, row) => sum + row.net_hours, 0).toFixed(2)),
      total_overtime_hours: Number(rows.reduce((sum, row) => sum + row.overtime_hours, 0).toFixed(2)),
      timesheets: rows,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
