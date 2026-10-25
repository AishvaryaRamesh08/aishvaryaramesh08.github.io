import type { CSSProperties } from "react";
import { ui } from "../data/ui";
import { cx } from "../lib/cx";

export type PlaceholderVariant = "image" | "text" | "link" | "button";

export interface PlaceholderAssetProps {
  /** Name of the asset the Owner still has to supply, e.g. "hookBefore image". */
  expected: string;
  /** Declared box of the real asset in px (images): keeps the layout position and size. */
  width?: number;
  height?: number;
  variant?: PlaceholderVariant;
  className?: string;
}

/** Accessible name for an image placeholder: names the expected asset (Req 28.8). */
export function placeholderLabel(expected: string): string {
  return `${ui.placeholder}: ${expected}`;
}

/**
 * Labelled stand-in for an Owner-supplied asset that is not provided yet (Req 4.5). Every variant
 * visibly shows the word "Placeholder" and the expected asset name, in the slot the real asset
 * would occupy. Image placeholders are `role="img"` named "Placeholder: <expected>" (Req 28.8);
 * text, link and button placeholders are plain text with no `href` and no interactivity.
 *
 * Rendered as `<span>`s so the component is valid inside paragraphs, headings and buttons.
 */
export function PlaceholderAsset({ expected, width, height, variant = "text", className }: PlaceholderAssetProps) {
  const frame = "border border-dashed border-border-strong bg-surface-2 text-text-muted";

  if (variant === "image") {
    const style: CSSProperties = {};
    if (width !== undefined && height !== undefined) {
      style.width = `${width}px`;
      style.maxWidth = "100%";
      style.aspectRatio = `${width} / ${height}`;
    }
    return (
      <span
        role="img"
        aria-label={placeholderLabel(expected)}
        data-placeholder={expected}
        style={style}
        className={cx(
          "flex min-h-24 flex-col items-center justify-center gap-1 rounded-md p-4 text-center",
          frame,
          className,
        )}
      >
        <span className="font-mono text-xs font-semibold tracking-wide uppercase">{ui.placeholder}</span>
        <span className="text-sm">{expected}</span>
      </span>
    );
  }

  const shape = variant === "button" ? "inline-flex min-h-11 items-center rounded-pill px-5" : "inline-block rounded-sm px-2 py-0.5";
  return (
    <span data-placeholder={expected} className={cx(shape, frame, "text-sm", className)}>
      <span className="font-mono font-semibold">{ui.placeholder}</span>: {expected}
    </span>
  );
}
