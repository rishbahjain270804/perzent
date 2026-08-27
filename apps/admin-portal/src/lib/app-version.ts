/**
 * Single source of truth for the Android app version that the backend advertises.
 * Bump together with apps/employee-mobile/app.json and android/app/build.gradle.
 * Environment overrides: LATEST_APP_VERSION, LATEST_APP_VERSION_CODE, MIN_APP_VERSION_CODE,
 * EMPLOYEE_APK_URL, NEXT_PUBLIC_PLAY_STORE_URL.
 */
export const LATEST_APP_VERSION = '1.2.0';
export const LATEST_APP_VERSION_CODE = 12;
/** Builds below this code were signed with the debug key and must be uninstalled before updating. */
export const REINSTALL_BELOW_VERSION_CODE = 12;

const toInt = (value: string | undefined, fallback: number) => {
  const parsed = parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function versionInfo(origin: string) {
  const version = process.env.LATEST_APP_VERSION || LATEST_APP_VERSION;
  const versionCode = toInt(process.env.LATEST_APP_VERSION_CODE, LATEST_APP_VERSION_CODE);
  const minRequired = toInt(process.env.MIN_APP_VERSION_CODE, 11);
  const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL || null;
  const downloadUrl = process.env.EMPLOYEE_APK_URL || `${origin}/api/download/apk`;
  return {
    latest_version: version,
    latest_version_code: versionCode,
    min_required_version_code: minRequired,
    force_update: false,
    download_url: downloadUrl,
    play_store_url: playStoreUrl,
    requires_reinstall_below_code: REINSTALL_BELOW_VERSION_CODE,
    release_notes:
      `v${version}: release-signed build, background tracking pauses on breaks, automatic check-out and break limits, ` +
      'stronger GPS validation. If you installed a version before 1.2.0, uninstall it first (the signing key changed).',
    updated_at: new Date().toISOString(),
  };
}
