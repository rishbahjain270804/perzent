import { NextResponse } from 'next/server';
import { getStore } from '@perzent/database';
import { SYSTEM_CONFIG, AttendanceSummary } from '@perzent/shared-types';

export async function GET() {
  const store = getStore();
  const records: AttendanceSummary[] = store.attendanceRecords.map((a) => {
    const user = store.users.find((u) => u.id === a.user_id);
    return {
      id: a.id,
      user_id: a.user_id,
      user_name: user ? user.full_name : 'Unknown',
      work_date: a.work_date,
      punch_in_time: a.punch_in_time,
      punch_out_time: a.punch_out_time,
      punch_in_by: a.punch_in_by,
      punch_out_by: a.punch_out_by,
      punch_out_override_time: a.punch_out_override_time,
      override_reason: a.override_reason,
      status: a.status,
      gross_worked_minutes: a.gross_worked_minutes || 0,
      total_break_minutes: a.total_break_minutes || 0,
      net_worked_minutes: a.net_worked_minutes || 0,
    };
  });
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = getStore();

    if (body.action === 'force_checkout') {
      const { attendance_id, override_time, reason } = body;
      const record = store.attendanceRecords.find((a) => a.id === attendance_id);
      if (!record) {
        return NextResponse.json({ error: 'Attendance session not found' }, { status: 404 });
      }

      record.punch_out_time = new Date().toISOString();
      record.punch_out_by = 'MANAGER';
      record.punch_out_override_time = override_time;
      record.override_reason = reason;
      record.status = 'CHECKED_OUT';

      return NextResponse.json({ success: true, message: 'Employee force checked out successfully.', record });
    }

    if (body.action === 'manual_checkin') {
      const { user_id, check_in_time, reason } = body;
      const todayStr = new Date().toISOString().split('T')[0];

      const newRecord = {
        id: `att-${Date.now()}`,
        user_id,
        work_date: todayStr,
        punch_in_time: check_in_time || new Date().toISOString(),
        punch_out_time: null,
        punch_in_by: 'MANAGER',
        punch_out_by: null,
        punch_in_lat: 28.6289,
        punch_in_lng: 77.3752,
        status: 'CHECKED_IN',
        override_reason: reason,
        gross_worked_minutes: 0,
        total_break_minutes: 0,
        net_worked_minutes: 0,
      };

      store.attendanceRecords.push(newRecord);
      return NextResponse.json({ success: true, message: 'Manual check-in created.', record: newRecord });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
