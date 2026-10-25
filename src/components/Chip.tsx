import type { ReactNode } from "react";
import { cx } from "../lib/cx";

export type ChipTone = "neutral" | "cyan" | "violet" | "green";

const toneClasses: Record<ChipTone, string> = {
  neutral: "border-border-strong text-text-muted",
  cyan: "border-accent-cyan text-accent-cyan-text",
  violet: "border-accent-violet text-accent-violet-text",
  green: "border-accent-green text-accent-green-text",
};

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}

/** Pill label, e.g. Hook panel labels and tech chips (Req 8.11). Text sits on a surface backing. */
export function Chip({ children, tone = "neutral", className }: ChipProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-pill border bg-surface px-3 py-1 font-mono text-xs leading-5",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface BadgeProps {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}

/** Small status marker, e.g. "work in progress" or "sample data" (Req 12.7, 15.10). */
export function Badge({ children, tone = "violet", className }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-sm border bg-surface px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-wide uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
