// One shared, rAF-throttled scroll listener for every consumer (design: Hooks).
import { useEffect, useEffectEvent } from "react";

export type ScrollFrameCallback = (scrollY: number) => void;

const callbacks = new Set<ScrollFrameCallback>();
let frame: number | null = null;

function flush(): void {
  frame = null;
  const y = window.scrollY;
  for (const callback of [...callbacks]) callback(y);
}

function requestFlush(): void {
  if (frame === null) frame = requestAnimationFrame(flush);
}

/** Subscribes `callback` to at most one call per animation frame while scrolling. */
export function subscribeScrollFrame(callback: ScrollFrameCallback): () => void {
  callbacks.add(callback);
  if (callbacks.size === 1) window.addEventListener("scroll", requestFlush, { passive: true });
  // Deliver the current position once so consumers start in sync (e.g. after a hash jump).
  requestFlush();
  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      window.removeEventListener("scroll", requestFlush);
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    }
  };
}

/** Calls `callback(scrollY)` once per frame in which the window scrolled. Always uses the latest callback. */
export function useScrollFrame(callback: ScrollFrameCallback): void {
  const onFrame = useEffectEvent(callback);
  useEffect(() => subscribeScrollFrame((y) => onFrame(y)), []);
}
