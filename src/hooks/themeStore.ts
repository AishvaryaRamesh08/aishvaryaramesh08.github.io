// Client Theme store (design "Theme before first paint", Req 5.2, 5.4, 5.5).
// The inline head script sets `html.dark` / `html.light` before first paint; this store adopts
// that class, then owns it. Usable outside React (canvas engines redraw on `subscribeTheme`).
// SSR-safe: nothing touches `window` / `document` until the store is read on the client.
import { otherTheme, resolveInitialTheme, THEME_STORAGE_KEY, type Theme } from "../lib/theme";

/** Duration of the themed color crossfade (Req 5.2: switch within 300 ms). */
export const THEME_TRANSITION_MS = 200;

/** Class on `<html>` that enables the themed transitions while a switch is in flight. */
export const THEME_SWITCHING_CLASS = "theme-switching";

const listeners = new Set<() => void>();
/** In-memory Theme: the source of truth after first read, so the toggle works without storage. */
let current: Theme | null = null;
let switchingTimer: ReturnType<typeof setTimeout> | undefined;

function readStoredTheme(): Theme {
  return resolveInitialTheme(() => window.localStorage.getItem(THEME_STORAGE_KEY));
}

/** Reads the class set by the head script; falls back to storage if the script did not run. */
function readDocumentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const { classList } = document.documentElement;
  if (classList.contains("light")) return "light";
  if (classList.contains("dark")) return "dark";
  return readStoredTheme();
}

function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (disabled, private mode quota, sandbox): keep the in-memory Theme
    // for this page session and show no error (Req 5.5).
  }
}

/** Applies the Theme classes and `color-scheme` to `<html>`, with a short themed crossfade. */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  // Enable the transition in the same style change as the class swap so it animates.
  root.classList.add(THEME_SWITCHING_CLASS);
  root.classList.remove(otherTheme(theme));
  root.classList.add(theme);
  root.style.colorScheme = theme;
  clearTimeout(switchingTimer);
  switchingTimer = setTimeout(() => {
    root.classList.remove(THEME_SWITCHING_CLASS);
  }, THEME_TRANSITION_MS + 50);
}

/** Current Theme on the client. */
export function getTheme(): Theme {
  if (current === null) current = readDocumentTheme();
  return current;
}

/** Prerender and hydration always render the dark (first-visit) branch; see ThemeProvider. */
export function getServerTheme(): Theme {
  return "dark";
}

/** Switches to `theme`: updates `<html>`, persists it (best effort) and notifies subscribers. */
export function setTheme(theme: Theme): void {
  if (theme === getTheme()) return;
  current = theme;
  applyTheme(theme);
  writeStoredTheme(theme);
  for (const listener of [...listeners]) listener();
}

/** Switches to the other Theme. */
export function toggleTheme(): void {
  setTheme(otherTheme(getTheme()));
}

/** Subscribes to Theme changes; returns the unsubscribe function. */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
