// Mobile_Menu (design: "Navigation and scrolling"; Req 7.9, 7.10, 7.12, 7.13, 27.2).
// A full-viewport modal dialog portalled into <body> (the glass header would otherwise become the
// containing block of a fixed panel). Mounted only while open, so it is absent from the
// prerendered HTML.
import { motion } from "framer-motion";
import { useEffect, useEffectEvent, useRef, type MouseEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { NavGroupId, SectionId } from "../data/types";
import { ui } from "../data/ui";
import { useMotionMode } from "../hooks/motionStore";
import { useEscapeKey } from "../hooks/useDismiss";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { getMediaQueryStore } from "../hooks/useMediaQuery";
import { useScrollLock } from "../hooks/useScrollLock";
import { cx } from "../lib/cx";
import { isPlainClick, NAV_LINKS } from "./navLinks";

/** Entrance length: within the 400 ms budget of Req 7.10. */
export const MOBILE_MENU_ENTER_S = 0.3;

/** Viewports at or above this width show the inline links (Mobile_Viewport is < 768 px). */
export const DESKTOP_NAV_QUERY = "(min-width: 48rem)";

export interface MobileMenuProps {
  /** The Nav_Group to mark as current (Req 7.11). */
  activeGroup: NavGroupId | null;
  /** Escape, the close control, or leaving the Mobile_Viewport: close and refocus the menu button. */
  onClose: () => void;
  /** A link was activated: close, then navigate to `target` (Req 7.13). */
  onNavigate: (target: SectionId) => void;
  /** The menu button; focus returns here on Escape and close (Req 7.13). */
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * While mounted: the rest of the page is `inert` and can't scroll, Tab cycles inside the panel,
 * and focus starts on the first link (Req 7.10, 7.12).
 */
export function MobileMenu({ activeGroup, onClose, onNavigate, menuButtonRef }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const reduced = useMotionMode() === "reduced";

  useFocusTrap(dialogRef, { active: true, initialFocus: firstLinkRef, returnFocusTo: menuButtonRef });
  useScrollLock(true);
  useEscapeKey(() => onClose(), true);

  // Rotating or resizing into the inline-links layout closes the menu instead of stranding a trap.
  const onLeaveMobile = useEffectEvent(() => onClose());
  useEffect(() => {
    const store = getMediaQueryStore(DESKTOP_NAV_QUERY);
    return store.subscribe(() => {
      if (store.getSnapshot()) onLeaveMobile();
    });
  }, []);

  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>, target: SectionId) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    onNavigate(target);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label={ui.menuDialog}
      tabIndex={-1}
      className="fixed inset-0 z-[var(--z-overlay)] overflow-y-auto bg-base outline-none"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOBILE_MENU_ENTER_S, ease: "easeOut" }}
        className="flex min-h-full flex-col px-[var(--gutter)] pb-8"
      >
        <div className="flex h-[var(--nav-h)] shrink-0 items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={ui.closeMenu}
            title={ui.closeMenu}
            className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-border-strong text-text hover:text-accent-cyan-text"
          >
            <CloseIcon />
          </button>
        </div>
        <nav aria-label={ui.primaryNav}>
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link, index) => {
              const current = link.id === activeGroup;
              return (
                <li key={link.id}>
                  <a
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={link.href}
                    aria-current={current ? "true" : undefined}
                    onClick={(event) => onLinkClick(event, link.target)}
                    className={cx(
                      "flex min-h-12 items-center gap-3 rounded-md px-2 font-heading text-xl text-text hover:text-accent-cyan-text",
                      current && "font-bold",
                    )}
                  >
                    {/* Non-color current indicator (Req 7.11): a bar beside the label. */}
                    <span
                      aria-hidden="true"
                      className={cx("h-6 w-1 rounded-full", current ? "bg-accent-cyan" : "bg-transparent")}
                    />
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </motion.div>
    </div>,
    document.body,
  );
}
