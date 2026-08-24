import { NextResponse } from 'next/server';
import { getStore } from '@perzent/database';
import { LiveTeamMember } from '@perzent/shared-types';

export async function GET() {
  const store = getStore();
  const todayStr = new Date().toISOString().split('T')[0];

  const liveMembers: LiveTeamMember[] = store.users
    .filter((u) => u.role === 'EMPLOYEE')
    .map((u) => {
      const attendance = store.attendanceRecords.find((a) => a.user_id === u.id && a.work_date === todayStr);
      const activeBreak = store.attendanceBreaks.find(
        (b) => attendance && b.attendance_id === attendance.id && !b.end_time
      );
      const lastWaypoint = store.locationWaypoints
        .filter((w) => w.user_id === u.id)
        .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
      const lastStop = store.locationStops
        .filter((s) => s.user_id === u.id)
        .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())[0];
      const device = store.userDevices.find((d) => d.user_id === u.id);
      const tamper = store.tamperLogs.find((t) => t.user_id === u.id);
      const dept = store.departments.find((d) => d.id === u.department_id);

      let shift_status: 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT' | 'OFF_DUTY' = 'OFF_DUTY';
      if (attendance) {
        if (attendance.status === 'CHECKED_OUT' || attendance.status === 'AUTO_CHECKED_OUT') {
          shift_status = 'CHECKED_OUT';
        } else if (activeBreak || attendance.status === 'ON_BREAK') {
          shift_status = 'ON_BREAK';
        } else {
          shift_status = 'CHECKED_IN';
        }
      }

      const is_moving = lastWaypoint ? lastWaypoint.speed > 3 : false;
      const dwell_minutes = lastStop ? Math.round(lastStop.dwell_duration_seconds / 60) : 0;

      const batteryLevel = device?.telemetry?.battery_level ?? 85;

      return {
        user_id: u.id,
        full_name: u.full_name,
        designation: u.designation,
        department_name: dept?.name || 'Field Hub',
        shift_status,
        current_location: lastWaypoint
          ? {
              latitude: lastWaypoint.latitude,
              longitude: lastWaypoint.longitude,
              accuracy: lastWaypoint.accuracy,
              speed: lastWaypoint.speed,
              heading: lastWaypoint.heading,
              address_name: lastStop?.address_name || 'Sector 62, Noida',
              last_ping_at: lastWaypoint.recorded_at,
            }
          : undefined,
        is_moving,
        dwell_minutes,
        battery_level: batteryLevel,
        telemetry: device?.telemetry,
        device_model: device?.device_model || 'Unbound Android Device',
        device_uuid: device?.device_uuid || 'DEV-PENDING',
        gps_enabled: !tamper || tamper.event_type !== 'GPS_DISABLED',
        has_tamper_alert: !!tamper,
      };
    });

  return NextResponse.json(liveMembers);
}
