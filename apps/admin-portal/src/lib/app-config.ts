import { prisma } from '@perzent/database';
import type { AppConfig } from '@prisma/client';
import { resolveRemoteConfig, type RemoteConfig } from '@perzent/shared-types';

/**
 * Remote-controlled status (maintenance, announcements, version overrides, support contact) and
 * the remote_config JSON (all app/portal tunables). Edited directly in the database (AppConfig row
 * "global", seeded by migration 20260828050000); cached per instance for 30 s.
 */
const CACHE_MS = 30_000;
let cache: { at: number; value: AppConfig } | null = null;

/** Used only if the seeded row was deleted: the product keeps running on defaults. */
const DEFAULT_CONFIG: AppConfig = {
  id: 'global',
  maintenance_enabled: false,
  maintenance_scope: 'ALL',
  maintenance_title: null,
  maintenance_message: null,
  maintenance_until: null,
  announcement: null,
  announcement_level: 'INFO',
  latest_app_version: null,
  latest_app_version_code: null,
  min_app_version_code: null,
  play_store_url: null,
  support_email: null,
  support_phone: null,
  remote_config: null,
  updated_at: new Date(0),
};

export async function getAppConfig(): Promise<AppConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  // A read, not an upsert: this sits on the public /api/status path and must never take a row lock.
  const value = (await prisma.appConfig.findUnique({ where: { id: 'global' } })) ?? DEFAULT_CONFIG;
  cache = { at: Date.now(), value };
  return value;
}

export function remoteConfigOf(config: AppConfig): RemoteConfig {
  return resolveRemoteConfig(config.remote_config);
}

export type MaintenanceTarget = 'MOBILE' | 'WEB';

export function maintenanceApplies(config: AppConfig, target: MaintenanceTarget): boolean {
  if (!config.maintenance_enabled) return false;
  const scope = (config.maintenance_scope || 'ALL').toUpperCase();
  return scope === 'ALL' || scope === target;
}

export type StatusView = {
  maintenance: {
    enabled: boolean;
    scope: 'ALL' | 'MOBILE' | 'WEB';
    mobile: boolean;
    web: boolean;
    title: string;
    message: string;
    until: string | null;
  };
  announcement: { text: string; level: 'INFO' | 'WARNING' | 'CRITICAL' } | null;
  support: { email: string | null; phone: string | null };
  /** Resolved remote configuration (defaults merged with the AppConfig.remote_config override). */
  config: RemoteConfig;
  server_time: string;
};

export function statusView(config: AppConfig): StatusView {
  const scope = ((config.maintenance_scope || 'ALL').toUpperCase() as 'ALL' | 'MOBILE' | 'WEB');
  const level = (config.announcement_level || 'INFO').toUpperCase();
  return {
    maintenance: {
      enabled: config.maintenance_enabled,
      scope,
      mobile: maintenanceApplies(config, 'MOBILE'),
      web: maintenanceApplies(config, 'WEB'),
      title: config.maintenance_title || 'Perzent is under maintenance',
      message: config.maintenance_message || 'We are making improvements. Please try again in a little while.',
      until: config.maintenance_until ? config.maintenance_until.toISOString() : null,
    },
    announcement: config.announcement?.trim()
      ? { text: config.announcement.trim(), level: level === 'WARNING' || level === 'CRITICAL' ? level : 'INFO' }
      : null,
    support: { email: config.support_email || null, phone: config.support_phone || null },
    config: remoteConfigOf(config),
    server_time: new Date().toISOString(),
  };
}
