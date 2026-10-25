// rAF driver for the stat-chip count-up (Req 9.6). Runs progress 0 → 1 once, the first time
// `active` turns true, then holds at the final text. The number formatting lives in the pure
// `countUpText` helper so it stays property-tested; this hook only owns the progress clock.
import { useEffect, useRef, useState } from "react";
import { useMotionMode } from "../../hooks/motionStore";
import { countUpText } from "../../lib/motion";

/** Count-up window: under 2 s per Req 9.6 (design uses 1.5 s). */
export const DEFAULT_COUNT_UP_MS = 1500;

/**
 * Text to display for `finalText`, counting up once when `active` becomes true with motion on.
 * Under Reduced_Motion_Mode, or before `active`, it returns the final text directly, so the DOM at
 * rest always shows the exact final value (Req 9.6) and SSR/hydration match (motion store is
 * "full" during prerender, but `active` is false until the chip is in view on the client).
 */
export function useCountUp(finalText: string, active: boolean, durationMs: number = DEFAULT_COUNT_UP_MS): string {
  const reduced = useMotionMode() === "reduced";
  const animate = active && !reduced;

  const [progress, setProgress] = useState(1);
  // Replays only on the first activation; once done it stays at 1 for the page's life.
  const played = useRef(false);

  useEffect(() => {
    if (!animate || played.current) return;
    played.current = true;
    let frame = 0;
    const start = performance.now();
    const span = durationMs > 0 ? durationMs : 1;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / span);
      // First frame moves from the initial 1 down to its real position, then climbs back to 1.
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, durationMs]);

  return countUpText(progress, finalText);
}
