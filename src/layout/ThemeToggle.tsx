import { useTheme } from "../hooks/useTheme";
import { themeToggleLabel } from "../lib/theme";

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

function SunIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/**
 * Navbar Theme toggle (Req 5.2, 5.3). The accessible name names the Theme it switches to;
 * the icon previews that Theme (sun while dark, moon while light).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { nextTheme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={themeToggleLabel(nextTheme)}
      title={themeToggleLabel(nextTheme)}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-pill border border-border-strong text-text hover:text-accent-cyan-text ${className}`.trim()}
    >
      {nextTheme === "light" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
