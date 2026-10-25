/// <reference types="vite/client" />

// Compile-time constants injected via `define` in vite.config.ts (see build/env.ts).

/** Normalized Base_Path with leading and trailing "/" (default "/"). */
declare const __BASE_PATH__: string;
/** Site_Origin without a trailing "/" (default "https://aishvaryaramesh08.github.io"). */
declare const __SITE_ORIGIN__: string;
/**
 * True when the resume PDF is supplied in the Content_Config and present under /public/
 * (build/contentValidation.ts). False renders the Download resume Placeholder_Asset (Req 9.10).
 */
declare const __RESUME_AVAILABLE__: boolean;

interface Window {
  /** Set to true by src/main.tsx after React hydrates; read by the head fail-safe script. */
  __hydrated?: boolean;
}

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_SITE_ORIGIN?: string;
}
