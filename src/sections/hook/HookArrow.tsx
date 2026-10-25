// The Hook_Arrow between the before/after panels (Req 8.10, 8.13, 8.14, 8.18, 8.21).
// decorative: `aria-hidden` and no focusable element. Points down between stacked mobile panels,
// then right between the side-by-side desktop panels. With motion on it draws once per page load
// (a module-level flag
// gates the replay on re-entry); under Reduced_Motion_Mode it renders in its final drawn state.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMotionMode } from "../../hooks/motionStore";

/** Set once the draw has played, so re-entering the Hook_Screen does not replay it (Req 8.13). */
let arrowPlayed = false;

/** How long the stroke takes to draw; well within the 3 s budget of Req 8.13. */
const DRAW_DURATION_S = 0.8;

export function HookArrow() {
  const reduced = useMotionMode() === "reduced";
  // Decide once on mount: animate only on the first play of a page load, with motion on. Captured
  // in state so re-renders (including a motion-mode flip after mount) don't restart the draw.
  const [animate] = useState(() => !reduced && !arrowPlayed);
  // Latch the play-once flag outside render, so a re-entry during the same page load stays static.
  useEffect(() => {
    if (animate) arrowPlayed = true;
  }, [animate]);

  // Right-pointing shaft + head between the panels.
  const path = "M4 16 H52";
  const head = "M44 8 L52 16 L44 24";

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 rotate-90 items-center justify-center text-accent-cyan md:rotate-0 md:px-2"
    >
      <svg
        viewBox="0 0 56 32"
        width="56"
        height="32"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-8 md:h-8 md:w-14"
      >
        <motion.path
          d={path}
          initial={animate ? { pathLength: 0 } : false}
          animate={animate ? { pathLength: 1 } : undefined}
          transition={animate ? { duration: DRAW_DURATION_S, ease: "easeInOut" } : undefined}
        />
        <motion.path
          d={head}
          initial={animate ? { pathLength: 0, opacity: 0 } : false}
          animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
          transition={
            animate ? { duration: DRAW_DURATION_S * 0.4, ease: "easeOut", delay: DRAW_DURATION_S } : undefined
          }
        />
      </svg>
    </span>
  );
}

/** Test-only: reset the play-once latch between renders. */
export function resetArrowPlayed(): void {
  arrowPlayed = false;
}
