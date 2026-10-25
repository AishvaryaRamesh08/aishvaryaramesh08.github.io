import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Element to render; pick the one that fits the surrounding semantics. */
  as?: "div" | "article" | "li" | "aside";
  /** Adds the gradient hairline border and cyan glow. */
  glow?: boolean;
}

/**
 * The only component that applies the `glass` and `glow-border` utilities (Req 5.11). Use it
 * only for allowlisted elements: the Hook_Screen after panel, Case_Study cards,
 * Certification_Cards and the Journey_Tooltip.
 */
export function GlassCard({ as: Tag = "div", glow = false, className, children, ...rest }: GlassCardProps) {
  return (
    <Tag className={cx("glass rounded-card", glow && "glow-border", className)} {...rest}>
      {children}
    </Tag>
  );
}
