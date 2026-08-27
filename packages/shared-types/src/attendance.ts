import { z } from 'zod';

export type ShiftStatus = 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT' | 'AUTO_CHECKED_OUT';
export type PunchBy = 'EMPLOYEE' | 'MANAGER' | 'OWNER' | 'AUTO_SYSTEM' | 'KIOSK';
export type BreakType = 'LUNCH' | 'TEA' | 'GENERAL';

export const DATE_ONLY_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const ForceCheckOutSchema = z.object({
  action: z.literal('force_checkout'),
  attendance_id: z.string().uuid(),
  override_time: z.string().regex(TIME_HHMM_REGEX, 'Time must be HH:mm').optional().or(z.literal('')),
  reason: z.string().trim().min(3, 'Reason for override is required').max(500),
});
export type ForceCheckOutDto = z.infer<typeof ForceCheckOutSchema>;

export const ManualCheckInSchema = z.object({
  action: z.literal('manual_checkin'),
  user_id: z.string().uuid(),
  work_date: z.string().regex(DATE_ONLY_REGEX, 'Date must be YYYY-MM-DD').optional().or(z.literal('')),
  check_in_time: z.string().regex(TIME_HHMM_REGEX, 'Time must be HH:mm').optional().or(z.literal('')),
  reason: z.string().trim().min(3, 'Reason for manual check-in is required').max(500),
});
export type ManualCheckInDto = z.infer<typeof ManualCheckInSchema>;

export const AttendanceActionSchema = z.discriminatedUnion('action', [ForceCheckOutSchema, ManualCheckInSchema]);

export const KioskPunchSchema = z.object({
  phone: z.string().trim().min(10).max(20),
  password: z.string().min(1).max(128),
  action: z.enum(['CHECK_IN', 'CHECK_OUT']),
  site_id: z.string().uuid().optional().or(z.literal('')),
});
export type KioskPunchDto = z.infer<typeof KioskPunchSchema>;

export const LeaveRequestSchema = z.object({
  leave_type: z.enum(['CASUAL', 'SICK', 'PAID', 'UNPAID']),
  start_date: z.string().regex(DATE_ONLY_REGEX, 'Start date must be YYYY-MM-DD'),
  end_date: z.string().regex(DATE_ONLY_REGEX, 'End date must be YYYY-MM-DD'),
  reason: z.string().trim().min(3, 'Reason is required').max(500),
});

export const LeaveReviewSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['APPROVE', 'REJECT']),
  review_notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export const CompanySettingsSchema = z.object({
  auto_checkout_time: z.string().regex(TIME_HHMM_REGEX, 'Auto checkout must be HH:mm').optional(),
  max_break_minutes: z.number().int().min(5).max(180).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  standard_daily_hours: z.number().min(1).max(24).optional(),
  route_retention_days: z.number().int().min(7).max(90).optional(),
  attendance_retention_days: z.number().int().min(30).max(365).optional(),
});

export interface AttendanceSummary {
  id: string;
  user_id: string;
  user_name: string;
  work_date: string;
  punch_in_time: string;
  punch_out_time?: string | null;
  punch_in_by: PunchBy;
  punch_out_by?: PunchBy | null;
  punch_out_override_time?: string | null;
  override_reason?: string | null;
  status: ShiftStatus;
  gross_worked_minutes: number;
  total_break_minutes: number;
  net_worked_minutes: number;
}
