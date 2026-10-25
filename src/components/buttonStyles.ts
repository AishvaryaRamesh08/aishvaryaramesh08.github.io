import { cx } from "../lib/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-[color,background-color,border-color,box-shadow] duration-200 " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

// Glows appear only in active interactive states (hover, keyboard focus), as Req 5.11 allows.
const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-accent-cyan-text text-[var(--color-base)] hover:shadow-glow-cyan focus-visible:shadow-glow-cyan",
  secondary:
    "border border-border-strong bg-surface text-text hover:border-accent-cyan hover:shadow-glow-cyan focus-visible:shadow-glow-cyan",
  ghost: "border border-transparent text-accent-cyan-text hover:bg-surface-2",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  // >= 44 px tall: comfortable touch target.
  // `text-body`, not `text-base`: `base` is also a color token here.
  md: "min-h-11 px-5 text-body",
};

/** Class list shared by `Button`, `LinkButton` and button-styled `ExternalLink`s. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cx(base, variants[variant], sizes[size], className);
}
