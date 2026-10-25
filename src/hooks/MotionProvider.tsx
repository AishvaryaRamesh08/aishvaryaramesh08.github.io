import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { useMotionMode } from "./motionStore";

/**
 * Makes Framer Motion obey the motion store instead of reading the media query itself,
 * so every motion consumer switches together (design D3, Req 23.8, 26.4).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const mode = useMotionMode();
  return <MotionConfig reducedMotion={mode === "reduced" ? "always" : "never"}>{children}</MotionConfig>;
}
