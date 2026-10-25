/**
 * Structural microcopy for the Built_With_AI_Section (Req 20), kept out of the component source
 * the same way `data/ui.ts` holds shared component microcopy. These are the fixed labels tied to
 * the three per-step entries (Req 20.2) and the two reflection parts (Req 20.5) — not Owner
 * content. All Owner-authored copy (the intro, step titles and entries, reflection items) comes
 * from `data/builtWithAi.ts`.
 */
import type { TimelineStep } from "../../data/types";

/** Keys of the three labelled entries each timeline step shows, in display order (Req 20.2). */
export const STEP_ENTRY_KEYS = ["aiDid", "ownerDecided", "ownerLearned"] as const;
export type StepEntryKey = (typeof STEP_ENTRY_KEYS)[number];

/** The visible label for each per-step entry (Req 20.2). */
export const STEP_ENTRY_LABEL: Record<StepEntryKey, string> = {
  aiDid: "What the AI did",
  ownerDecided: "What I decided or reviewed",
  ownerLearned: "What I learned",
};

/** Names the expected content when a per-step entry is still a placeholder (Req 20.4). */
export function stepEntryExpected(step: TimelineStep, key: StepEntryKey): string {
  return `${step.title} — ${STEP_ENTRY_LABEL[key]}`;
}

export const builtWithAiCopy = {
  /** Heading above the seven-step timeline. */
  timelineHeading: "How this site was built, step by step",
  /** Heading above the reflection block (Req 20.5). */
  reflectionHeading: "What AI did well / where I had to step in",
  /** The two labelled reflection parts (Req 20.5). */
  didWellLabel: "What AI did well",
  steppedInLabel: "Where I had to step in",
} as const;
