/**
 * Mutable runtime settings that remote config may override after start-up. Kept in its own module
 * (no imports) so both the API config and the RemoteConfigService can read/write it without cycles.
 */
export const runtime = {
  /** Set from RemoteConfig.api_base_url when present; null = use the built-in default. */
  apiBaseUrl: null as string | null,
};
