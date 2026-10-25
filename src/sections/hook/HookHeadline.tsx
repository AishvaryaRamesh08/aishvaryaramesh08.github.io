// The Hook headline (Req 8.8, 8.9, 8.18, 8.21). Rendered as styled text, not a heading element:
// it is a `<p id="hook-headline">` that labels the section via `aria-labelledby` (Req 3.2, 8.9).
//
// With motion on, part 2 begins to appear only after part 1 is fully displayed, and both parts
// finish within 3 s of first render; the sequence plays once per page load. Under reduced motion
// both parts render fully on first paint. On mobile the parts wrap onto two lines.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HOOK_HEADLINE_ID } from "../../components/SectionShell";
import { hook } from "../../data/hook";
import { useMotionMode } from "../../hooks/motionStore";

/** Plays the reveal once per page load, so re-mounting the Hook_Screen shows the final state. */
let headlinePlayed = false;

/** Part 1 fade-in length; part 2 starts after it, both done well under the 3 s budget (Req 8.8). */
const PART_DURATION_S = 0.6;

export function HookHeadline() {
  const reduced = useMotionMode() === "reduced";
  // Decide once on mount (see HookArrow): captured in state so later re-renders don't replay it.
  const [animate] = useState(() => !reduced && !headlinePlayed);
  useEffect(() => {
    if (animate) headlinePlayed = true;
  }, [animate]);

  return (
    <p
      id={HOOK_HEADLINE_ID}
      className="flex flex-col gap-1 font-heading text-hero leading-tight font-bold tracking-tight text-text md:flex-row md:items-baseline md:justify-between md:gap-6"
    >
      <motion.span
        initial={animate ? { opacity: 0, y: 8 } : false}
        animate={animate ? { opacity: 1, y: 0 } : undefined}
        transition={animate ? { duration: PART_DURATION_S, ease: "easeOut" } : undefined}
      >
        {hook.headline.before}
      </motion.span>
      <motion.span
        className="text-accent-cyan-text"
        initial={animate ? { opacity: 0, y: 8 } : false}
        animate={animate ? { opacity: 1, y: 0 } : undefined}
        // Begins only after part 1 has fully appeared (Req 8.8).
        transition={animate ? { duration: PART_DURATION_S, ease: "easeOut", delay: PART_DURATION_S } : undefined}
      >
        {hook.headline.after}
      </motion.span>
    </p>
  );
}

/** Test-only: reset the play-once latch between renders. */
export function resetHeadlinePlayed(): void {
  headlinePlayed = false;
}
