// GSAP lifecycle bound to the motion store (design: "Reduced-motion source of truth").
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type DependencyList, type RefObject } from "react";
import { useMotionMode, type MotionMode } from "./motionStore";

/** Sets up tweens/ScrollTriggers for `mode`; may return extra cleanup run on revert. */
export type GsapBuild = (mode: MotionMode) => void | (() => void);

function restoreScroll(y: number): void {
  if (window.scrollY !== y) window.scrollTo({ top: y, behavior: "instant" });
}

/**
 * Runs `build(mode)` inside a `gsap.context()` and reverts it whenever the motion mode or
 * `deps` change, or on unmount. Revert kills ScrollTriggers, removes pins and inline styles,
 * so elements return to their final DOM state (D2). Because removing pins changes the page
 * height, the scroll position from before the revert is restored after the rebuild (Req 26.4).
 * `scope` limits selector text in `build` to that element's subtree.
 */
export function useGsapContext(build: GsapBuild, deps: DependencyList, scope?: RefObject<Element | null>): void {
  const mode = useMotionMode();
  const savedScrollY = useRef<number | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => build(mode), scope?.current ?? undefined);

    const y = savedScrollY.current;
    if (y !== null) {
      savedScrollY.current = null;
      ScrollTrigger.refresh();
      restoreScroll(y);
    }

    return () => {
      const before = window.scrollY;
      ctx.revert();
      savedScrollY.current = before;
      restoreScroll(before);
    };
    // `deps` is the caller's dependency list (same contract as useEffect); `build` and
    // `scope` are read fresh on every run triggered by those deps or by a mode change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ...deps]);
}
