import { prisma } from '@perzent/database';
import type { AppConfig } from '@prisma/client';

/**
 * Remote-controlled status (maintenance, announcements, version overrides, support contact).
 * Edited directly in the database (AppConfig row "global"); cached per instance for 30 s.
 */
const CACHE_MS = 30_000;
let cache: { at: number; value: AppConfig } | null = null;

export async function getAppConfig(): Promise<AppConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = await prisma.appConfig.upsert({ where: { id: 'global' }, update: {}, create: { id: 'global' } });
  cache = { at: Date.now(), value };
  return value;
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
    server_time: new Date().toISOString(),
  };
}
