import { z } from 'zod';

export type TamperEventType = 'GPS_DISABLED' | 'PERMISSION_REVOKED' | 'MOCK_LOCATION_DETECTED';

export type SoundMode = 'NORMAL' | 'SILENT' | 'VIBRATE' | 'DND';
export type BatteryState = 'CHARGING' | 'DISCHARGING' | 'FULL';
export type BatteryHealthState = 'GOOD' | 'NORMAL' | 'OVERHEAT' | 'DEGRADED';

export interface DeviceTelemetry {
  // Live Battery Status
  battery_level: number; // 0 - 100%
  battery_status: BatteryState; // CHARGING / DISCHARGING / FULL
  battery_health?: BatteryHealthState; // GOOD / NORMAL
  battery_temperature?: number; // e.g. 32.4 °C
  battery_power_save?: boolean; // Power saving mode

  // Sound Tracking
  sound_volume: number; // 0 - 100%
  sound_mode: SoundMode; // NORMAL / SILENT / VIBRATE / DND

  // Brightness Tracking
  brightness_level: number; // 0 - 100%
  brightness_auto?: boolean; // Auto/Adaptive brightness

  // Storage Tracking
  storage_used_gb: number; // e.g. 58.4 GB
  storage_total_gb: number; // e.g. 128.0 GB
  storage_free_gb: number; // e.g. 69.6 GB
  storage_free_pct: number; // e.g. 54.4%

  // RAM Tracking
  ram_used_gb: number; // e.g. 4.6 GB
  ram_total_gb: number; // e.g. 8.0 GB
  ram_usage_pct: number; // e.g. 57.5%

  updated_at: string;
}

export const DeviceTelemetrySchema = z.object({
  battery_level: z.number().min(0).max(100),
  battery_status: z.enum(['CHARGING', 'DISCHARGING', 'FULL']).default('DISCHARGING'),
  battery_health: z.enum(['GOOD', 'NORMAL', 'OVERHEAT', 'DEGRADED']).optional(),
  battery_temperature: z.number().optional(),
  battery_power_save: z.boolean().optional(),
  sound_volume: z.number().min(0).max(100),
  sound_mode: z.enum(['NORMAL', 'SILENT', 'VIBRATE', 'DND']).default('NORMAL'),
  brightness_level: z.number().min(0).max(100),
  brightness_auto: z.boolean().optional(),
  storage_used_gb: z.number(),
  storage_total_gb: z.number(),
  storage_free_gb: z.number(),
  storage_free_pct: z.number(),
  ram_used_gb: z.number(),
  ram_total_gb: z.number(),
  ram_usage_pct: z.number(),
  updated_at: z.string().optional(),
});

export const LocationPingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().nullable().optional(),
  accuracy: z.number(),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  battery_level: z.number().min(0).max(100).optional(),
  telemetry: DeviceTelemetrySchema.optional(),
  is_mock: z.boolean().default(false),
  timestamp: z.string(), // ISO string
});
export type LocationPingDto = z.infer<typeof LocationPingSchema>;

export const BatchLocationSyncSchema = z.object({
  attendance_id: z.string().uuid(),
  device_uuid: z.string().min(1),
  pings: z.array(LocationPingSchema).min(1),
});
export type BatchLocationSyncDto = z.infer<typeof BatchLocationSyncSchema>;

export const ReportTamperSchema = z.object({
  attendance_id: z.string().uuid().optional(),
  event_type: z.enum(['GPS_DISABLED', 'PERMISSION_REVOKED', 'MOCK_LOCATION_DETECTED']),
  details: z.string().optional(),
  timestamp: z.string(),
});
export type ReportTamperDto = z.infer<typeof ReportTamperSchema>;

export interface LiveTeamMember {
  user_id: string;
  full_name: string;
  designation: string;
  department_name?: string;
  shift_status: 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT' | 'OFF_DUTY';
  current_location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number;
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
  has_tamper_alert: boolean;
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
