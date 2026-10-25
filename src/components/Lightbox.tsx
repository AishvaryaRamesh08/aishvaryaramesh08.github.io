import { motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ui } from "../data/ui";
import { useMotionMode } from "../hooks/motionStore";
import { useEscapeKey } from "../hooks/useDismiss";
import { useFocusTrap, type FocusTarget } from "../hooks/useFocusTrap";
import { useScrollLock } from "../hooks/useScrollLock";
import { fitToViewport, type Size } from "../lib/layout";
import { Button } from "./Button";

/** Space between the enlarged content and its caption. */
const CAPTION_GAP_PX = 12;
/** Minimum side padding; the top/bottom minimum also clears the close button (44 px at 12 px). */
const MIN_PAD_X_PX = 16;
const MIN_PAD_Y_PX = 64;
/** The padding grows to 5 % of the viewport, so the content uses at most ~90vw × 90vh. */
const PAD_FRACTION = 0.05;
const ENTER_SECONDS = 0.2;

export interface LightboxProps {
  open: boolean;
  /** Called on Escape and on the close button; the owner sets `open` to false. */
  onClose: () => void;
  /** Visible caption under the content; it also names the dialog. */
  caption: ReactNode;
  /** Intrinsic size of the content, used only for its aspect ratio. */
  intrinsic: Size;
  /** The enlarged artifact. It is placed in a box of the fitted size: make it fill it (`h-full w-full`). */
  children: ReactNode;
  /** The activated thumbnail; focus returns here on close (Req 16.9, 20.9). */
  returnFocusTo?: FocusTarget;
}

function readWidth(): number {
  const width = document.documentElement.clientWidth;
  return width > 0 ? width : window.innerWidth;
}

function readHeight(): number {
  const height = document.documentElement.clientHeight;
  return height > 0 ? height : window.innerHeight;
}

const noSize = () => 0;

/** Layout viewport size, tracked only while `active`; 0 on the server. */
function useViewportSize(active: boolean): Size {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!active) return () => {};
      window.addEventListener("resize", listener);
      return () => window.removeEventListener("resize", listener);
    },
    [active],
  );
  const width = useSyncExternalStore(subscribe, active ? readWidth : noSize, noSize);
  const height = useSyncExternalStore(subscribe, active ? readHeight : noSize, noSize);
  return { width, height };
}

/**
 * Enlarged view of a gallery artifact or screenshot with its caption (Req 16.6, 16.9, 20.9).
 * A modal `role="dialog"` portalled into `<body>`: the page behind is inert and doesn't scroll,
 * Tab stays inside, and Escape or the close button closes it and returns focus to the opener.
 * The content is scaled with `fitToViewport` to fit the viewport without page scrolling.
 * Renders nothing while closed, so it is absent from the prerendered HTML.
 */
export function Lightbox({ open, onClose, caption, intrinsic, children, returnFocusTo }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const captionRef = useRef<HTMLElement>(null);
  const captionId = useId();
  const reduced = useMotionMode() === "reduced";
  const viewport = useViewportSize(open);
  const [captionHeight, setCaptionHeight] = useState(0);

  useFocusTrap(dialogRef, { active: open, returnFocusTo, initialFocus: closeRef });
  useScrollLock(open);
  useEscapeKey(() => onClose(), open);

  // The caption wraps to the available width, so its height decides how tall the content can be.
  useEffect(() => {
    const element = captionRef.current;
    if (!open || !element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setCaptionHeight(entry?.borderBoxSize?.[0]?.blockSize ?? element.offsetHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const padding = {
    x: Math.max(MIN_PAD_X_PX, viewport.width * PAD_FRACTION),
    y: Math.max(MIN_PAD_Y_PX, viewport.height * PAD_FRACTION),
  };
  const box = fitToViewport(
    intrinsic,
    { width: viewport.width, height: viewport.height - captionHeight - CAPTION_GAP_PX },
    padding,
  );
  const captionMaxWidth = Math.max(0, viewport.width - 2 * padding.x);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={captionId}
      tabIndex={-1}
      data-lightbox=""
      className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-[color-mix(in_srgb,var(--color-base)_90%,transparent)] outline-none"
    >
      <Button ref={closeRef} variant="secondary" onClick={onClose} className="absolute top-3 right-3">
        {ui.close}
      </Button>
      <motion.figure
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: ENTER_SECONDS, ease: "easeOut" }}
        className="m-0 flex flex-col items-center"
        style={{ gap: CAPTION_GAP_PX }}
      >
        <div
          data-lightbox-content=""
          className="overflow-hidden rounded-md bg-surface"
          style={{ width: box.width, height: box.height }}
        >
          {children}
        </div>
        <figcaption
          id={captionId}
          ref={captionRef}
          className="text-center text-text"
          style={{ maxWidth: captionMaxWidth }}
        >
          {caption}
        </figcaption>
      </motion.figure>
    </div>,
    document.body,
  );
}
