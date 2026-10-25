// Build-time resolution of the Base_Path and Site_Origin overrides (Req 2.3, 2.4, 2.8).
// Shared by vite.config.ts and vitest.config.ts so app code sees the same constants in both.
import { DEFAULT_SITE_ORIGIN, normalizeBase, normalizeOrigin } from "../src/lib/url.ts";

export interface SiteEnv {
  /** Normalized Base_Path, always with leading and trailing "/". */
  basePath: string;
  /** Site_Origin without a trailing "/". */
  siteOrigin: string;
}

/** Resolves `VITE_BASE_PATH ?? "/"` and `VITE_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN`. */
export function resolveSiteEnv(env: Record<string, string | undefined>): SiteEnv {
  return {
    basePath: normalizeBase(env.VITE_BASE_PATH ?? "/"),
    siteOrigin: normalizeOrigin(env.VITE_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN),
  };
}

/** `define` entries injecting the resolved values as compile-time constants. */
export function siteEnvDefines(siteEnv: SiteEnv): Record<string, string> {
  return {
    __BASE_PATH__: JSON.stringify(siteEnv.basePath),
    __SITE_ORIGIN__: JSON.stringify(siteEnv.siteOrigin),
  };
}
