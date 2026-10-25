import type { ComponentPropsWithRef } from "react";
import { ui } from "../data/ui";
import { VisuallyHidden } from "./VisuallyHidden";

/** Inline link style used when no `className` is passed (pass `buttonClasses()` for a button look). */
const DEFAULT_LINK_CLASSES = "text-accent-cyan-text underline underline-offset-4 hover:no-underline";

export interface ExternalLinkProps extends Omit<ComponentPropsWithRef<"a">, "target" | "rel"> {
  href: string;
}

/**
 * Link that opens in a new tab with `rel="noopener noreferrer"`. "(opens in new tab)" is added to
 * the accessible name, both for visible-text links and for links named with `aria-label`.
 */
export function ExternalLink({ href, children, className, "aria-label": ariaLabel, ...rest }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel ? `${ariaLabel} ${ui.opensInNewTab}` : undefined}
      className={className ?? DEFAULT_LINK_CLASSES}
      {...rest}
    >
      {children}
      {ariaLabel ? null : (
        <>
          {" "}
          <VisuallyHidden>{ui.opensInNewTab}</VisuallyHidden>
        </>
      )}
    </a>
  );
}
