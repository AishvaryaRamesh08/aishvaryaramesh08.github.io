import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { otherTheme } from "../lib/theme";
import { getServerTheme, getTheme, subscribeTheme, toggleTheme } from "./themeStore";
import { ThemeContext, type ThemeContextValue } from "./useTheme";

/**
 * Exposes the Theme store to React (design "Theme before first paint", Req 5.2–5.5).
 *
 * The `<html>` class is already correct before first paint (inline head script), so React only
 * drives the toggle's label and icon. Prerender has no `window`, so the server snapshot is the
 * first-visit dark Theme; `useSyncExternalStore` hydrates with that same snapshot (no mismatch)
 * and re-renders with the class-derived client Theme right after hydration.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, nextTheme: otherTheme(theme), toggle: toggleTheme }),
    [theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
