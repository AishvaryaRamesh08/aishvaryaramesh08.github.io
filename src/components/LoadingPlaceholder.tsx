import type { CSSProperties } from "react";
import { ui } from "../data/ui";
import { cx } from "../lib/cx";

export interface LoadingPlaceholderProps {
  /** Visible status text; defaults to "Loading…". */
  label?: string;
  /** Fixed box in px; the ratio is kept when the box shrinks to fit. */
  width?: number;
  height?: number;
  /** CSS min-height for boxes without a fixed size, e.g. a lazy section's reserved height. */
  minHeight?: string;
  className?: string;
}

/**
 * Fixed-size skeleton with a spinner and `aria-busy`. The spinner is a CSS animation, so the
 * reduced-motion rules in globals.css render it static (Req 26.2).
 */
export function LoadingPlaceholder({ label = ui.loading, width, height, minHeight, className }: LoadingPlaceholderProps) {
  const style: CSSProperties = { minHeight };
  if (width !== undefined && height !== undefined) {
    style.width = `${width}px`;
    style.maxWidth = "100%";
    style.aspectRatio = `${width} / ${height}`;
  }
  return (
    <div
      role="status"
      aria-busy="true"
      style={style}
      className={cx(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-border bg-surface text-sm text-text-muted",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="block size-8 animate-spin rounded-full border-2 border-border-strong border-t-accent-cyan"
      />
      <span>{label}</span>
    </div>
  );
}
