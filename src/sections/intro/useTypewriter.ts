// rAF driver for the Intro_Screen typewriter (Req 9.2, 9.11). Feeds elapsed-since-start time into
// the pure `typewriterFrame` helper, so the frame math stays property-tested in `lib/motion.ts`
// and this hook only owns the clock. The loop pauses when the tab is hidden (so the line does not
// jump on return) and when motion is reduced (the component shows static lines instead).
import { useEffect, useRef, useState } from "react";
import { useDocumentVisible } from "../../hooks/useDocumentVisible";
import { useMotionMode } from "../../hooks/motionStore";
import { DEFAULT_TYPE_TIMING, typewriterFrame, type TypeTiming, type TypewriterFrame } from "../../lib/motion";

/**
 * Current typewriter frame for `lines`, advancing in real time while motion is on and the tab is
 * visible. While reduced or hidden the accumulated elapsed time is frozen, so the visible line
 * holds its position; it resumes from there without catching up. SSR / first render returns the
 * frame at elapsed 0 (motion store reports "full" during prerender), matching hydration.
 */
export function useTypewriter(
  lines: readonly string[],
  timing: TypeTiming = DEFAULT_TYPE_TIMING,
): TypewriterFrame {
  const reduced = useMotionMode() === "reduced";
  const visible = useDocumentVisible();
  const running = !reduced && visible;

  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += now - last;
      last = now;
      setElapsed(elapsedRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return typewriterFrame(elapsed, lines, timing);
}
