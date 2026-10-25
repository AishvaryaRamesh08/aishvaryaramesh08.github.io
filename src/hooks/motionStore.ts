// Reduced-motion source of truth (design D3, "Reduced-motion source of truth").
// Framer Motion (via MotionProvider), GSAP contexts, canvas engines, timers and CSS
// (`html[data-motion]`) all read this store, so a live preference change propagates
// everywhere in the same frame without a reload (Req 6.14, 23.8, 26.4, 26.5).
import { useSyncExternalStore } from "react";
import { getMediaQueryStore } from "./useMediaQuery";

export type MotionMode = "full" | "reduced";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const reducedQuery = getMediaQueryStore(REDUCED_MOTION_QUERY);
const listeners = new Set<() => void>();
let releaseQuery: (() => void) | null = null;

/** Current mode on the client; "full" when matchMedia is unavailable. */
export function getMotionMode(): MotionMode {
  return reducedQuery.getSnapshot() ? "reduced" : "full";
}

/** Mirrors the mode onto `<html data-motion>` so CSS rules follow the store. */
function syncDataset(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.motion = getMotionMode();
}

function handleQueryChange(): void {
  // Write the attribute before notifying, so CSS and React update together.
  syncDataset();
  for (const listener of [...listeners]) listener();
}

/**
 * Subscribes to motion-mode changes. Usable outside React (canvas engines, scroll helpers).
 * One matchMedia listener is shared by all subscribers.
 */
export function subscribeMotionMode(listener: () => void): () => void {
  listeners.add(listener);
  if (!releaseQuery) {
    syncDataset();
    releaseQuery = reducedQuery.subscribe(handleQueryChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && releaseQuery) {
      releaseQuery();
      releaseQuery = null;
    }
  };
}

/** Prerender (and hydration) always renders the full-motion branch; final-state DOM is the same. */
function getServerMotionMode(): MotionMode {
  return "full";
}

/** `"full"` or `"reduced"`, updated live when the OS preference changes. */
export function useMotionMode(): MotionMode {
  return useSyncExternalStore(subscribeMotionMode, getMotionMode, getServerMotionMode);
}
