// A single Intro_Screen stat chip (Req 9.5, 9.6). The number counts up once, the first time the
// chip is at least 50% in view with motion on, ending on the exact final text; under reduced motion
// the final text shows immediately. The animated number is `aria-hidden`; an sr-only copy always
// carries the final value plus its label, so screen readers never hear intermediate counts.
import { useRef } from "react";
import { useInViewOnce } from "../../hooks/useInViewOnce";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import { cx } from "../../lib/cx";
import type { StatChip as StatChipData } from "../../data/types";
import { useCountUp } from "./useCountUp";

export interface StatChipProps {
  chip: StatChipData;
  className?: string;
}

export function StatChip({ chip, className }: StatChipProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Half the chip in view triggers the one-time count-up (Req 9.6).
  const inView = useInViewOnce(ref, { amount: 0.5 });
  const value = useCountUp(chip.finalText, inView);

  return (
    <div
      ref={ref}
      className={cx(
        "flex flex-col items-start gap-0.5 rounded-card border border-border bg-surface px-4 py-3",
        className,
      )}
    >
      <span aria-hidden="true" className="font-heading text-2xl leading-none font-bold tracking-tight text-text">
        {value}
      </span>
      <span aria-hidden="true" className="text-sm text-text-muted">
        {chip.label}
      </span>
      {/* The stable, complete value for assistive tech (Req 9.6, 9.11-style). */}
      <VisuallyHidden>
        {chip.finalText} {chip.label}
      </VisuallyHidden>
    </div>
  );
}
