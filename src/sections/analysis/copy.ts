/**
 * Structural microcopy for the Analysis_Section (Req 16), kept out of the component source the
 * same way `data/ui.ts` holds shared component microcopy. These are labels tied to fixed enum
 * values (artifact source, the "illustrative" marker) and sub-headings for the courses and case
 * challenge blocks — not Owner content. All Owner-authored copy (item titles/descriptions,
 * captions, text alternatives, course names, the case challenge) comes from `data/analysis.ts`.
 */
import type { Artifact } from "../../data/types";

/** Marks every gallery artifact as illustrative, not real client work (Req 16.3). */
export const ILLUSTRATIVE_LABEL = "Illustrative";

/** Human-readable source attribution for each artifact `source` value (Req 16.3). */
export const SOURCE_LABEL: Record<Artifact["source"], string> = {
  coursework: "From coursework",
  "product-tamu": "From the Product@TAMU case work",
};

export const analysisCopy = {
  /** Heading above the five analysis-practice cards. */
  practicesHeading: "How I work beyond code",
  /** Heading above the Texas A&M course list (Req 16.4). */
  coursesHeading: "Relevant Texas A&M coursework",
  /** Heading above the case-challenge line (Req 16.5). */
  caseChallengeHeading: "Team case challenge",
} as const;
