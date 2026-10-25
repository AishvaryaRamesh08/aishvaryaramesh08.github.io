import type { MouseEvent } from "react";
import { ui } from "../data/ui";

export interface SkipLinkProps {
  /** ID of the main landmark; it needs `tabIndex={-1}` so it can take focus. */
  targetId?: string;
}

/**
 * "Skip to content": render it as the first focusable element on the page. Hidden until it
 * receives keyboard focus, visible while focused (Req 28.6, 28.7).
 */
export function SkipLink({ targetId = "main" }: SkipLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    // Move focus explicitly: not every browser focuses a fragment target on activation.
    // Focusing also scrolls it into view, clear of the Navbar via `scroll-padding-top`.
    event.preventDefault();
    target.focus();
  };
  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only rounded-md bg-surface px-4 py-2 font-medium text-text focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[var(--z-skip)]"
    >
      {ui.skipLink}
    </a>
  );
}
