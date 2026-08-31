import { z } from 'zod';

/**
 * Remote configuration: every tunable the app and portal read at start-up, so behaviour can be
 * changed by editing the AppConfig.remote_config JSON in the database — no release required.
 * Unknown keys are ignored; missing keys fall back to these defaults, so partial overrides are fine.
 */
export const RemoteConfigSchema = z
  .object({
    /** Base URL for the REST API (lets the backend move without an app release). */
    api_base_url: z.string().url().optional(),
    /** Public web URL used for FAQ/support/privacy links. */
    web_url: z.string().url().optional(),
    /** Feature switches. */
    features: z
      .object({
        /** Use the direct Supabase RPC path when the server hands out a token. */
        direct_access: z.boolean().default(true),
        /** Local reminder notifications (check-in / auto check-out / break ending). */
        reminders: z.boolean().default(true),
        /** Show the in-app shift history card. */
        shift_history: z.boolean().default(true),
      })
      .default({}),
    /** Timings (milliseconds unless suffixed). */
    intervals: z
      .object({
        readiness_ms: z.number().int().min(5_000).max(300_000).default(15_000),
        js_ping_ms: z.number().int().min(30_000).max(900_000).default(120_000),
        on_duty_telemetry_ms: z.number().int().min(60_000).max(1_800_000).default(120_000),
        off_duty_telemetry_ms: z.number().int().min(60_000).max(3_600_000).default(600_000),
        manager_team_ms: z.number().int().min(10_000).max(300_000).default(30_000),
        status_poll_ms: z.number().int().min(60_000).max(3_600_000).default(300_000),
        update_check_ms: z.number().int().min(300_000).max(86_400_000).default(900_000),
        portal_live_poll_ms: z.number().int().min(2_000).max(60_000).default(5_000),
        portal_dashboard_poll_ms: z.number().int().min(10_000).max(300_000).default(30_000),
      })
      .default({}),
    /** Location capture and quality gates. */
    location: z
      .object({
        native_interval_ms: z.number().int().min(1_000).max(60_000).default(3_000),
        min_move_meters: z.number().min(1).max(200).default(10),
        stationary_sample_ms: z.number().int().min(60_000).max(3_600_000).default(600_000),
        flush_interval_ms: z.number().int().min(2_000).max(120_000).default(6_000),
        /** Check-in: wait at most this long for a GPS fix before offering a weak-signal check-in. */
        checkin_fix_timeout_ms: z.number().int().min(5_000).max(120_000).default(20_000),
        /** Check-in: fixes worse than this (metres) are flagged as weak signal. */
        checkin_max_accuracy_m: z.number().min(10).max(1_000).default(100),
        /** Manager view: minutes without a ping before an employee shows as lost. */
        presence_lost_minutes: z.number().min(1).max(60).default(2),
      })
      .default({}),
    /** Reminder offsets. */
    reminders: z
      .object({
        before_auto_checkout_minutes: z.number().int().min(5).max(180).default(30),
        break_ending_minutes: z.number().int().min(1).max(30).default(5),
      })
      .default({}),
    /** Short copy overrides (plain text) keyed by id; the app falls back to its built-in strings. */
    copy: z.record(z.string(), z.string()).default({}),
  })
  .passthrough();

export type RemoteConfig = z.infer<typeof RemoteConfigSchema>;

export const REMOTE_CONFIG_DEFAULTS: RemoteConfig = RemoteConfigSchema.parse({});

/**
 * Hosts the app may be pointed at by `api_base_url`. A remote override is powerful (every phone
 * follows it), so even a tampered AppConfig row can only move traffic between our own hosts.
 */
export const ALLOWED_API_HOST_SUFFIXES = ['perzent.jspcoders.app', '.jspcoders.app', '.vercel.app'] as const;

export function isAllowedApiBaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_API_HOST_SUFFIXES.some((suffix) => (suffix.startsWith('.') ? host.endsWith(suffix) : host === suffix));
  } catch {
    return false;
  }
}

/** Merge a stored JSON override onto the defaults, dropping anything that fails validation. */
export function resolveRemoteConfig(stored: unknown): RemoteConfig {
  const parsed = RemoteConfigSchema.safeParse(stored && typeof stored === 'object' ? stored : {});
  if (!parsed.success) {
    // Invalid override: keep the product running on defaults rather than failing every client.
    return REMOTE_CONFIG_DEFAULTS;
  }
  const config = parsed.data;
  if (config.api_base_url && !isAllowedApiBaseUrl(config.api_base_url)) {
    const { api_base_url: _ignored, ...rest } = config;
    return rest as RemoteConfig;
  }
  return config;
}
