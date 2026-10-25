// Pure Theme rules (design "Theme before first paint", Req 5.1, 5.3, 5.5).
// The inline script in index.html applies the same rule before first paint; keep them in sync.
// `prefers-color-scheme` is never consulted: a first visit is always dark.

export type Theme = "dark" | "light";

/** localStorage key shared with the inline head script. */
export const THEME_STORAGE_KEY = "theme";

/** Theme for a first visit, an unreadable storage or an unrecognised stored value. */
export const DEFAULT_THEME: Theme = "dark";

/**
 * Resolves the initial Theme from a stored value. Returns `"light"` only for exactly `"light"`,
 * and `"dark"` for anything else (`null`, other strings, non-strings).
 *
 * `stored` may also be a reader such as `() => localStorage.getItem(THEME_STORAGE_KEY)`; a reader
 * that throws (storage disabled, sandboxed iframe, quota/security errors) yields the default.
 */
export function resolveInitialTheme(stored: unknown): Theme {
  let value = stored;
  if (typeof stored === "function") {
    try {
      value = (stored as () => unknown)();
    } catch {
      return DEFAULT_THEME;
    }
  }
  return value === "light" ? "light" : DEFAULT_THEME;
}

/** The Theme the toggle switches to. */
export function otherTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/** Accessible name of the Theme toggle: names the Theme it will switch to (Req 5.3). */
export function themeToggleLabel(nextTheme: Theme): string {
  return `Switch to ${nextTheme} theme`;
}
