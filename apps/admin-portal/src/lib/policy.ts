import { prisma } from '@perzent/database';
import { addDays, minutesBetween, safeTimeZone, workDateToString, zonedTimeToUtc } from './time';

export type CompanyPolicy = {
  id: string;
  name: string;
  timezone: string;
  auto_checkout_time: string;
  max_break_minutes: number;
  route_retention_days: number;
  attendance_retention_days: number;
  standard_daily_hours: number;
  plan_tier: string;
};

const policySelect = {
  id: true,
  name: true,
  timezone: true,
  auto_checkout_time: true,
  max_break_minutes: true,
  route_retention_days: true,
  attendance_retention_days: true,
  standard_daily_hours: true,
  plan_tier: true,
} as const;

export async function getCompanyPolicy(companyId: string): Promise<CompanyPolicy> {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: policySelect });
  return { ...company, timezone: safeTimeZone(company.timezone) };
}

/** The instant at which an open shift must be auto-closed. Shifts that start after the cut-off run until the next day's cut-off. */
export function autoCheckoutDeadline(policy: Pick<CompanyPolicy, 'timezone' | 'auto_checkout_time'>, workDate: Date, punchInTime: Date): Date {
  let deadline = zonedTimeToUtc(workDateToString(workDate), policy.auto_checkout_time, policy.timezone);
  if (deadline <= punchInTime) deadline = addDays(deadline, 1);
  return deadline;
}

const lastEnforcedAt = new Map<string, number>();
const ENFORCE_THROTTLE_MS = 20_000;

export type EnforcementResult = { auto_checked_out: number; breaks_ended: number };

/**
 * Applies the company's automation policies to its open shifts:
 *  - auto check-out once the configured cut-off time has passed,
 *  - end breaks that exceed the maximum break duration.
 * Called lazily from read/write paths (throttled per instance) and from the daily cron.
 */
export async function enforceCompanyPolicies(
  companyId: string,
  options: { force?: boolean; policy?: CompanyPolicy } = {}
): Promise<EnforcementResult> {
  const result: EnforcementResult = { auto_checked_out: 0, breaks_ended: 0 };
  const now = Date.now();
  if (!options.force && now - (lastEnforcedAt.get(companyId) || 0) < ENFORCE_THROTTLE_MS) return result;
  lastEnforcedAt.set(companyId, now);

  const policy = options.policy || (await getCompanyPolicy(companyId));
  const openRecords = await prisma.attendanceRecord.findMany({
    where: { status: { in: ['CHECKED_IN', 'ON_BREAK'] }, user: { company_id: companyId } },
    include: {
      breaks: { where: { end_time: null }, orderBy: { start_time: 'desc' }, take: 1 },
      waypoints: { orderBy: { recorded_at: 'desc' }, take: 1 },
    },
  });

  for (const record of openRecords) {
    const nowDate = new Date();
    const deadline = autoCheckoutDeadline(policy, record.work_date, record.punch_in_time);
    const activeBreak = record.breaks[0];

    if (nowDate >= deadline) {
      let breakMinutes = record.total_break_minutes;
      const lastPoint = record.waypoints[0];
      await prisma.$transaction(async (tx) => {
        if (activeBreak) {
          const end = activeBreak.start_time > deadline ? activeBreak.start_time : deadline;
          const duration = minutesBetween(activeBreak.start_time, end);
          breakMinutes += duration;
          await tx.attendanceBreak.update({
            where: { id: activeBreak.id },
            data: { end_time: end, duration_minutes: duration, ended_by: 'AUTO_TIMEOUT_30MIN' },
          });
        }
        const gross = minutesBetween(record.punch_in_time, deadline);
        await tx.attendanceRecord.update({
          where: { id: record.id },
          data: {
            status: 'AUTO_CHECKED_OUT',
            punch_out_time: deadline,
            punch_out_by: 'AUTO_SYSTEM',
            override_reason: record.override_reason || `Auto checked out at ${policy.auto_checkout_time} (${policy.timezone})`,
            punch_out_lat: lastPoint?.latitude ?? record.punch_in_lat,
            punch_out_lng: lastPoint?.longitude ?? record.punch_in_lng,
            gross_worked_minutes: gross,
            total_break_minutes: breakMinutes,
            net_worked_minutes: Math.max(0, gross - breakMinutes),
          },
        });
      });
      result.auto_checked_out += 1;
      continue;
    }

    if (record.status === 'ON_BREAK' && activeBreak) {
      const elapsed = minutesBetween(activeBreak.start_time, nowDate);
      if (elapsed >= policy.max_break_minutes) {
        const end = new Date(activeBreak.start_time.getTime() + policy.max_break_minutes * 60000);
        await prisma.$transaction([
          prisma.attendanceBreak.update({
            where: { id: activeBreak.id },
            data: { end_time: end, duration_minutes: policy.max_break_minutes, ended_by: 'AUTO_TIMEOUT_30MIN' },
          }),
          prisma.attendanceRecord.update({
            where: { id: record.id },
            data: { status: 'CHECKED_IN', total_break_minutes: { increment: policy.max_break_minutes } },
          }),
        ]);
        result.breaks_ended += 1;
      }
    }
  }

  return result;
}

export type MaintenanceSummary = {
  companies: number;
  auto_checked_out: number;
  breaks_ended: number;
  sessions_purged: number;
  waypoints_purged: number;
  shifts_compacted: number;
  points_compacted: number;
};

/** Daily housekeeping used by the cron endpoint (pg_cron covers policies/retention more frequently). */
export async function runMaintenance(): Promise<MaintenanceSummary> {
  const summary: MaintenanceSummary = {
    companies: 0, auto_checked_out: 0, breaks_ended: 0, sessions_purged: 0, waypoints_purged: 0, shifts_compacted: 0, points_compacted: 0,
  };
  // Compact closed shifts into RouteArchive first so retention deletes as little raw data as possible.
  const { compactClosedShifts } = await import('./route-archive');
  // ~3 round trips per shift inside a 60 s function budget: keep the batch small; the cron is daily
  // and the backlog simply carries over.
  const compaction = await compactClosedShifts({ minAgeHours: 3, limit: 60 });
  summary.shifts_compacted = compaction.compacted;
  summary.points_compacted = compaction.points_removed;
  const companies = await prisma.company.findMany({ select: policySelect });

  for (const company of companies) {
    summary.companies += 1;
    const policy = { ...company, timezone: safeTimeZone(company.timezone) };
    const enforced = await enforceCompanyPolicies(company.id, { force: true, policy });
    summary.auto_checked_out += enforced.auto_checked_out;
    summary.breaks_ended += enforced.breaks_ended;

    const cutoff = addDays(new Date(), -policy.route_retention_days);
    const purged = await prisma.locationWaypoint.deleteMany({
      where: { user: { company_id: company.id }, recorded_at: { lt: cutoff } },
    });
    summary.waypoints_purged += purged.count;
  }

  const sessions = await prisma.session.deleteMany({ where: { expires_at: { lt: new Date() } } });
  summary.sessions_purged = sessions.count;
  return summary;
}
