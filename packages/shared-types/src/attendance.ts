import { z } from 'zod';

export type ShiftStatus = 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT' | 'AUTO_CHECKED_OUT';
export type PunchBy = 'EMPLOYEE' | 'MANAGER' | 'OWNER' | 'AUTO_SYSTEM';
export type BreakType = 'LUNCH' | 'TEA' | 'GENERAL';

export const CheckInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().max(100, 'GPS accuracy too low'),
  device_uuid: z.string().min(1, 'Device UUID is required'),
  battery_level: z.number().min(0).max(100).optional(),
});
export type CheckInDto = z.infer<typeof CheckInSchema>;

export const CheckOutSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().max(100),
  device_uuid: z.string().min(1),
  battery_level: z.number().min(0).max(100).optional(),
});
export type CheckOutDto = z.infer<typeof CheckOutSchema>;

export const StartBreakSchema = z.object({
  attendance_id: z.string().uuid(),
  break_type: z.enum(['LUNCH', 'TEA', 'GENERAL']).default('LUNCH'),
});
export type StartBreakDto = z.infer<typeof StartBreakSchema>;

export const EndBreakSchema = z.object({
  break_id: z.string().uuid(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
});
export type EndBreakDto = z.infer<typeof EndBreakSchema>;

export const ForceCheckOutSchema = z.object({
  attendance_id: z.string().uuid(),
  override_time: z.string(), // ISO string or HH:mm time
  reason: z.string().min(3, 'Reason for override is required'),
});
export type ForceCheckOutDto = z.infer<typeof ForceCheckOutSchema>;

export const ManualCheckInSchema = z.object({
  user_id: z.string().uuid(),
  check_in_time: z.string(),
  reason: z.string().min(3, 'Reason for manual check-in is required'),
});
export type ManualCheckInDto = z.infer<typeof ManualCheckInSchema>;

export interface AttendanceSummary {
  id: string;
  user_id: string;
  user_name: string;
  work_date: string;
  punch_in_time: string;
  punch_out_time?: string;
  punch_in_by: PunchBy;
  punch_out_by?: PunchBy;
  punch_out_override_time?: string;
  override_reason?: string;
  status: ShiftStatus;
  gross_worked_minutes: number;
  total_break_minutes: number;
  net_worked_minutes: number;
}
