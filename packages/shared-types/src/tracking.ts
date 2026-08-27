import { z } from 'zod';

export type TamperEventType =
  | 'GPS_DISABLED'
  | 'PERMISSION_REVOKED'
  | 'MOCK_LOCATION_DETECTED'
  | 'FACE_MISMATCH'
  | 'GEOFENCE_BREACH';

export type BatteryState = 'CHARGING' | 'DISCHARGING' | 'FULL';

/**
 * Work-readiness telemetry collected by the Android app.
 * Only signals with a workforce purpose are collected (battery, power-save, GPS state, mock location).
 */
export interface DeviceTelemetry {
  battery_level: number; // 0 - 100%
  battery_status?: BatteryState;
  battery_power_save?: boolean;
  developer_options_enabled?: boolean;
  location_services_enabled?: boolean;
  location_permission_granted?: boolean;
  background_location_permission_granted?: boolean;
  mock_location_detected?: boolean;
  app_version?: string;
  updated_at?: string;
}

export const DeviceTelemetrySchema = z.object({
  battery_level: z.number().min(0).max(100),
  battery_status: z.enum(['CHARGING', 'DISCHARGING', 'FULL']).optional(),
  battery_power_save: z.boolean().optional(),
  developer_options_enabled: z.boolean().optional(),
  location_services_enabled: z.boolean().optional(),
  location_permission_granted: z.boolean().optional(),
  background_location_permission_granted: z.boolean().optional(),
  mock_location_detected: z.boolean().optional(),
  app_version: z.string().max(40).optional(),
  updated_at: z.string().max(64).optional(),
});

export const DeviceInfoSchema = z.object({
  device_model: z.string().max(160).optional(),
  os_version: z.string().max(80).optional(),
});

export const WaypointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).optional(),
  speed: z.number().min(0).max(150).optional(), // m/s
  heading: z.number().min(0).max(360).optional(),
  recorded_at: z.string().datetime({ offset: true }).optional(),
});
export type WaypointDto = z.infer<typeof WaypointSchema>;

export interface LocationPingDto {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export const WaypointBatchSchema = z.object({
  waypoints: z.array(WaypointSchema).min(1).max(500),
});

export const IntegritySchema = z.object({
  location_permission_granted: z.boolean(),
  background_location_permission_granted: z.boolean().optional(),
  location_services_enabled: z.boolean(),
  battery_power_save: z.boolean(),
  battery_level: z.number().min(0).max(100),
  mock_location_detected: z.boolean(),
  developer_options_enabled: z.boolean().optional(),
});
export type IntegrityDto = z.infer<typeof IntegritySchema>;

export const MobileCheckInSchema = z.object({
  action: z.literal('check_in'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).optional(),
  integrity: IntegritySchema,
});
export const MobileStartBreakSchema = z.object({
  action: z.literal('start_break'),
  break_type: z.enum(['LUNCH', 'TEA', 'GENERAL']).optional(),
});
export const MobileResumeSchema = z.object({
  action: z.literal('resume'),
  integrity: IntegritySchema,
});
export const MobileCheckOutSchema = z.object({
  action: z.literal('check_out'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).optional(),
});
export const MobileAttendanceActionSchema = z.discriminatedUnion('action', [
  MobileCheckInSchema,
  MobileStartBreakSchema,
  MobileResumeSchema,
  MobileCheckOutSchema,
]);

export type LiveShiftStatus = 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT' | 'OFF_DUTY';

export interface LiveTeamMember {
  user_id: string;
  full_name: string;
  designation: string;
  department_name?: string;
  shift_status: LiveShiftStatus;
  punch_in_time: string | null;
  punch_out_time: string | null;
  current_location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number; // m/s
    heading: number;
    address_name?: string;
    last_ping_at: string;
  };
  is_moving: boolean;
  dwell_minutes: number;
  battery_level?: number;
  telemetry?: DeviceTelemetry;
  device_model?: string;
  device_uuid?: string;
  gps_enabled: boolean;
  is_gps_disconnected: boolean;
  seconds_since_last_ping: number | null;
  has_tamper_alert: boolean;
  tamper_reason: string | null;
}

export interface RouteTimelineStop {
  id: string;
  address_name: string;
  latitude: number;
  longitude: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface RouteTimelineWaypoint {
  id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  recorded_at: string;
}

export interface DailyRoutePlayback {
  user_id: string;
  user_name: string;
  date: string;
  total_distance_km: number;
  stops: RouteTimelineStop[];
  waypoints: RouteTimelineWaypoint[];
  break_intervals: { start_time: string; end_time: string; duration_minutes: number }[];
}
