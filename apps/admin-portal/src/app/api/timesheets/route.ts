import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('start_date');
    const endDateStr = searchParams.get('end_date');
    const departmentId = searchParams.get('department_id');
    const format = searchParams.get('format'); // 'csv' or 'json'

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { standard_daily_hours: true },
    });
    const standardDailyMinutes = Math.round((company?.standard_daily_hours || 8.0) * 60);

    const whereClause: any = {
      user: {
        company_id: session.companyId,
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
        ...(departmentId ? { department_id: departmentId } : {}),
      },
    };

    if (startDateStr && endDateStr) {
      whereClause.work_date = {
        gte: new Date(`${startDateStr}T00:00:00.000Z`),
        lte: new Date(`${endDateStr}T23:59:59.999Z`),
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            designation: true,
            department: { select: { name: true } },
          },
        },
        site: {
          select: { name: true },
        },
      },
      orderBy: [{ work_date: 'desc' }, { punch_in_time: 'asc' }],
      take: 2000,
    });

    const timesheetRows = records.map((record: any) => {
      const netMinutes = record.net_worked_minutes || 0;
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
        punch_in: record.punch_in_time ? record.punch_in_time.toISOString() : null,
        punch_out: record.punch_out_time ? record.punch_out_time.toISOString() : null,
        status: record.status,
        gross_hours: Number((record.gross_worked_minutes / 60).toFixed(2)),
        break_hours: Number((record.total_break_minutes / 60).toFixed(2)),
        net_hours: Number((netMinutes / 60).toFixed(2)),
        regular_hours: Number((regularMinutes / 60).toFixed(2)),
        overtime_hours: Number((overtimeMinutes / 60).toFixed(2)),
      };
    });

    if (format === 'csv') {
      const headers = [
        'Employee Name',
        'Phone',
        'Department',
        'Designation',
        'Date',
        'Shift Status',
        'Punch In (UTC)',
        'Punch Out (UTC)',
        'Gross Hours',
        'Break Hours',
        'Net Worked Hours',
        'Regular Hours',
        'Overtime Hours',
        'Site / Location',
      ];

      const csvLines = [headers.join(',')];
      for (const row of timesheetRows) {
        csvLines.push([
          `"${row.user_name}"`,
          `"${row.phone}"`,
          `"${row.department}"`,
          `"${row.designation}"`,
          `"${row.work_date}"`,
          `"${row.status}"`,
          `"${row.punch_in || ''}"`,
          `"${row.punch_out || ''}"`,
          row.gross_hours,
          row.break_hours,
          row.net_hours,
          row.regular_hours,
          row.overtime_hours,
          `"${row.site_name}"`,
        ].join(','));
      }

      return new NextResponse(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="perzent-timesheets-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      standard_daily_hours: company?.standard_daily_hours || 8.0,
      total_records: timesheetRows.length,
      total_net_hours: Number(timesheetRows.reduce((sum, r) => sum + r.net_hours, 0).toFixed(2)),
      total_overtime_hours: Number(timesheetRows.reduce((sum, r) => sum + r.overtime_hours, 0).toFixed(2)),
      timesheets: timesheetRows,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
