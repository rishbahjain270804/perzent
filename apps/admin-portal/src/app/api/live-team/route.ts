import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: {
        company_id: session.companyId,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
      },
      include: {
        department: { select: { name: true } },
        devices: { where: { is_active: true }, take: 1 },
        attendances: {
          where: { work_date: today },
          take: 1,
          include: {
            breaks: { where: { end_time: null }, take: 1 },
            waypoints: { orderBy: { recorded_at: 'desc' }, take: 1 },
            stops: { orderBy: { end_time: 'desc' }, take: 1 },
            tamper_logs: { orderBy: { occurred_at: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { full_name: 'asc' },
    });

    return NextResponse.json(users.map((user: any) => {
      const attendance = user.attendances?.[0];
      const waypoint = attendance?.waypoints?.[0];
      const stop = attendance?.stops?.[0];
      const tamper = attendance?.tamper_logs[0];
      const device = user.devices[0];
      const telemetry = device?.telemetry && typeof device.telemetry === 'object' ? device.telemetry as any : undefined;
      const shiftStatus = !attendance
        ? 'OFF_DUTY'
        : attendance.status === 'AUTO_CHECKED_OUT' ? 'CHECKED_OUT' : attendance.status;

      const hasPunchLocation = Number.isFinite(attendance?.punch_in_lat) && Number.isFinite(attendance?.punch_in_lng);
      const currentLocation = waypoint ? {
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
        accuracy: waypoint.accuracy,
        speed: waypoint.speed,
        heading: waypoint.heading,
        address_name: stop?.address_name || `${waypoint.latitude.toFixed(4)}°N, ${waypoint.longitude.toFixed(4)}°E`,
        last_ping_at: waypoint.recorded_at.toISOString(),
      } : (hasPunchLocation ? {
        latitude: attendance.punch_in_lat,
        longitude: attendance.punch_in_lng,
        accuracy: 10,
        speed: 0,
        heading: 0,
        address_name: 'Checked In Spot',
        last_ping_at: attendance.punch_in_time ? new Date(attendance.punch_in_time).toISOString() : new Date().toISOString(),
      } : undefined);

      return {
        user_id: user.id,
        full_name: user.full_name,
        designation: user.designation,
        department_name: user.department?.name || 'Unassigned',
        shift_status: shiftStatus,
        current_location: currentLocation,
        is_moving: Boolean(waypoint && waypoint.speed > 3),
        dwell_minutes: stop ? Math.round(stop.dwell_duration_seconds / 60) : 0,
        battery_level: telemetry?.battery_level,
        telemetry,
        device_model: device?.device_model || 'No device bound',
        device_uuid: device?.device_uuid,
        gps_enabled: tamper?.event_type !== 'GPS_DISABLED',
        has_tamper_alert: Boolean(tamper),
      };
    }));
  } catch (error) {
    return authErrorResponse(error);
  }
}
