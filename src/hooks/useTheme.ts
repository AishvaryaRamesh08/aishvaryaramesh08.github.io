import { createContext, useContext } from "react";
import type { Theme } from "../lib/theme";

export interface ThemeContextValue {
  /** Theme currently applied to `<html>`. */
  theme: Theme;
  /** Theme the toggle switches to; drives its accessible name (Req 5.3). */
  nextTheme: Theme;
  /** Switches to `nextTheme` without a reload (Req 5.2). */
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** `{ theme, nextTheme, toggle }` from the nearest ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>");
  return value;
}
