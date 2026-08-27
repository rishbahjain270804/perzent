import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { currentDwellMinutes } from '@perzent/location-engine';
import { SYSTEM_CONFIG, type LiveTeamMember } from '@perzent/shared-types';
import { authErrorResponse, requireSession } from '@/lib/auth';
import { enforceCompanyPolicies, getCompanyPolicy } from '@/lib/policy';
import { workDateFor } from '@/lib/time';

export const dynamic = 'force-dynamic';

const RECENT_POINTS = 25;

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const policy = await getCompanyPolicy(session.companyId);
    await enforceCompanyPolicies(policy.id, { policy });
    const today = workDateFor(policy.timezone);

    const users = await prisma.user.findMany({
      where: {
        company_id: session.companyId,
        role: { in: ['EMPLOYEE', 'MANAGER'] },
        status: 'ACTIVE',
        ...(session.role === 'MANAGER' ? { manager_id: session.userId } : {}),
      },
      include: {
        department: { select: { name: true } },
        devices: { where: { is_active: true }, orderBy: { last_seen_at: 'desc' }, take: 1 },
        attendances: {
          where: { OR: [{ work_date: today }, { status: { in: ['CHECKED_IN', 'ON_BREAK'] } }] },
          orderBy: { punch_in_time: 'desc' },
          take: 1,
          include: {
            waypoints: { orderBy: { recorded_at: 'desc' }, take: RECENT_POINTS },
            tamper_logs: { orderBy: { occurred_at: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { full_name: 'asc' },
    });

    const nowEpoch = Date.now();
    const members: LiveTeamMember[] = users.map((user) => {
      const attendance = user.attendances[0];
      const recent = attendance?.waypoints ?? [];
      const waypoint = recent[0];
      const tamper = attendance?.tamper_logs[0];
      const device = user.devices[0];
      const telemetry = device?.telemetry && typeof device.telemetry === 'object' ? (device.telemetry as any) : undefined;

      const shiftStatus: LiveTeamMember['shift_status'] = !attendance
        ? 'OFF_DUTY'
        : attendance.status === 'AUTO_CHECKED_OUT'
          ? 'CHECKED_OUT'
          : attendance.status;

      const pingDate = waypoint?.recorded_at || attendance?.punch_in_time || null;
      const secondsSinceLastPing = pingDate ? Math.max(0, Math.floor((nowEpoch - pingDate.getTime()) / 1000)) : null;
      const isGpsDisconnected =
        shiftStatus === 'CHECKED_IN' && secondsSinceLastPing !== null && secondsSinceLastPing > SYSTEM_CONFIG.LIVE_STALE_SECONDS;

      const hasPunchLocation = Number.isFinite(attendance?.punch_in_lat) && Number.isFinite(attendance?.punch_in_lng);
      const currentLocation: LiveTeamMember['current_location'] = waypoint
        ? {
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
            accuracy: waypoint.accuracy,
            speed: waypoint.speed,
            heading: waypoint.heading,
            address_name: `${waypoint.latitude.toFixed(4)}, ${waypoint.longitude.toFixed(4)}`,
            last_ping_at: waypoint.recorded_at.toISOString(),
          }
        : hasPunchLocation && attendance
          ? {
              latitude: attendance.punch_in_lat as number,
              longitude: attendance.punch_in_lng as number,
              accuracy: 25,
              speed: 0,
              heading: 0,
              address_name: 'Check-in location',
              last_ping_at: attendance.punch_in_time.toISOString(),
            }
          : undefined;

      const mockDetected = telemetry?.mock_location_detected === true;
      const locationServicesOff = telemetry?.location_services_enabled === false;
      const tamperReason = isGpsDisconnected
        ? `No GPS ping for over ${Math.round(SYSTEM_CONFIG.LIVE_STALE_SECONDS / 60)} minutes (location or internet off)`
        : mockDetected
          ? 'Mock/fake location app detected'
          : locationServicesOff && shiftStatus === 'CHECKED_IN'
            ? 'Location services turned off'
            : tamper?.details || null;

      return {
        user_id: user.id,
        full_name: user.full_name,
        designation: user.designation,
        department_name: user.department?.name || 'Unassigned',
        shift_status: shiftStatus,
        punch_in_time: attendance?.punch_in_time.toISOString() || null,
        punch_out_time: attendance?.punch_out_time?.toISOString() || null,
        current_location: currentLocation,
        is_moving: Boolean(waypoint && waypoint.speed > SYSTEM_CONFIG.STATIONARY_SPEED_THRESHOLD_MS),
        dwell_minutes: recent.length > 1 ? currentDwellMinutes([...recent].reverse()) : 0,
        battery_level: typeof telemetry?.battery_level === 'number' ? telemetry.battery_level : undefined,
        telemetry,
        device_model: device?.device_model || undefined,
        device_uuid: device?.device_uuid,
        gps_enabled: !isGpsDisconnected && !locationServicesOff,
        is_gps_disconnected: isGpsDisconnected,
        seconds_since_last_ping: secondsSinceLastPing,
        has_tamper_alert: Boolean(tamperReason),
        tamper_reason: tamperReason,
      };
    });

    return NextResponse.json(members);
  } catch (error) {
    return authErrorResponse(error);
  }
}
