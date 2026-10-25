// Page scroll lock for modal overlays (design: Hooks; Mobile_Menu, lightboxes).
import { useEffect } from "react";

let lockCount = 0;
let restore: (() => void) | null = null;

function lock(): void {
  lockCount += 1;
  if (lockCount > 1) return;
  const html = document.documentElement;
  const { overflow, scrollbarGutter, paddingRight } = html.style;
  // Measure before hiding overflow; keep the gutter so the layout doesn't shift sideways.
  const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
  const supportsGutter = typeof CSS !== "undefined" && CSS.supports?.("scrollbar-gutter", "stable");
  if (scrollbarWidth > 0) {
    if (supportsGutter) html.style.scrollbarGutter = "stable";
    else html.style.paddingRight = `${scrollbarWidth}px`;
  }
  html.style.overflow = "hidden";
  restore = () => {
    html.style.overflow = overflow;
    html.style.scrollbarGutter = scrollbarGutter;
    html.style.paddingRight = paddingRight;
  };
}

function unlock(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && restore) {
    restore();
    restore = null;
  }
}

/**
 * Sets `overflow: hidden` on `<html>` while `active`, preserving the scrollbar gutter. Nested
 * locks are counted; the original styles come back when the last one releases.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
