// Tech chips for an expanded Case_Study (Req 12.3, 12.4). When a Case_Study expands with motion on,
// the chips stagger into view and the whole sequence finishes within 600 ms of expansion. Under
// Reduced_Motion_Mode the chips appear immediately in their final position with no animation.
//
// The list is a `<ul>` of `Chip`s; animation is purely visual (opacity/translate), so the chips are
// always present in the accessibility tree regardless of motion state.
import { motion } from "framer-motion";
import { Chip } from "../../components/Chip";
import { useMotionMode } from "../../hooks/motionStore";

/** Last chip must finish by 600 ms (Req 12.3): base + (n-1)·step + duration ≤ 0.6 s. */
const ITEM_DURATION_S = 0.25;
const MAX_TOTAL_S = 0.6;

export interface TechChipsProps {
  /** Human-readable tech labels, in `projects.ts` order. */
  labels: readonly string[];
  /** Run the stagger now (the panel just expanded). When false, chips render in final state. */
  animate: boolean;
  /** Accessible name for the list. */
  "aria-label"?: string;
}

export function TechChips({ labels, animate, "aria-label": ariaLabel }: TechChipsProps) {
  const reduced = useMotionMode() === "reduced";
  // Play only when expanding with motion on (Req 12.3); otherwise show the final state (Req 12.4).
  const play = animate && !reduced;

  // Spread the stagger so even many chips land within the 600 ms budget.
  const step = labels.length > 1 ? Math.min(0.06, (MAX_TOTAL_S - ITEM_DURATION_S) / (labels.length - 1)) : 0;

  return (
    <ul aria-label={ariaLabel} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {labels.map((label, index) => (
        <motion.li
          key={label}
          initial={play ? { opacity: 0, y: 6 } : false}
          animate={play ? { opacity: 1, y: 0 } : undefined}
          transition={play ? { duration: ITEM_DURATION_S, ease: "easeOut", delay: index * step } : undefined}
        >
          <Chip tone="cyan">{label}</Chip>
        </motion.li>
      ))}
    </ul>
  );
}
