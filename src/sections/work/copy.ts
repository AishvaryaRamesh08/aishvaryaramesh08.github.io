// Visitor-visible microcopy for the Featured_Work section (Req 4.1): kept out of component source
// so no hard-coded string ships in JSX. The five subsection headings are the fixed structure
// required by Req 12.2 (Challenge, Approach, Architecture diagram, Outcome, Tech, in order).

export interface WorkCopy {
  /** The five expanded-panel subsection headings, in Req 12.2 order. */
  subsections: {
    challenge: string;
    approach: string;
    architecture: string;
    outcome: string;
    tech: string;
  };
  /** Badge shown on the card and in the panel for an in-progress Case_Study (Req 12.7). */
  workInProgress: string;
  /** Prefix for an award badge, e.g. "Award: Spotlight Award". */
  awardLabel: string;
  /** Accessible label for the tech chip list in a panel. */
  techListLabel: string;
  /** Hint shown on a collapsed card prompting expansion. */
  expandHint: string;
  /** Hint shown on an expanded card prompting collapse. */
  collapseHint: string;
  /** Microcopy for the embedded Dependency_Demo (Req 13). */
  demo: DemoCopy;
}

/** Visitor-visible strings for the Autosys Dependency_Demo (Req 13.3–13.7). */
export interface DemoCopy {
  /** Short instruction shown above the graph. */
  instructions: string;
  /** Accessible name of the whole demo region. */
  regionLabel: string;
  /** Accessible name of the interactive graph. */
  graphLabel: string;
  /** Reset control label (Req 13.5). */
  reset: string;
  /** Legend: swatch label for the single failed job. */
  legendFailed: string;
  /** Legend: swatch label for a downstream (impacted) job. */
  legendDownstream: string;
  /** Legend: swatch label for an unaffected job. */
  legendIdle: string;
  /** Heading above the live status description. */
  statusHeading: string;
  /** Status shown when nothing is failed yet (Req 13.6). */
  idleStatus: string;
  /** Builds the status sentence for a failed job and its impacted jobs (Req 13.6). */
  failureStatus: (failedLabel: string, impacted: readonly string[]) => string;
  /** Status fragment stating that no downstream jobs are affected (Req 13.7). */
  zeroDownstream: (failedLabel: string) => string;
}

export const workCopy = {
  subsections: {
    challenge: "Challenge",
    approach: "Approach",
    architecture: "Architecture diagram",
    outcome: "Outcome",
    tech: "Tech",
  },
  workInProgress: "Work in progress",
  awardLabel: "Award",
  techListLabel: "Technologies used",
  expandHint: "View case study",
  collapseHint: "Hide case study",
  demo: {
    instructions:
      "Select a job to mark it as failed and see which downstream jobs it would hold up. Select it again, or Reset, to clear.",
    regionLabel: "Dependency failure demo",
    graphLabel: "Job dependency graph",
    reset: "Reset",
    legendFailed: "Failed job",
    legendDownstream: "Impacted downstream job",
    legendIdle: "Unaffected job",
    statusHeading: "Failure impact",
    idleStatus: "No job is failed. Select a job to see its downstream impact.",
    failureStatus: (failedLabel, impacted) =>
      `${failedLabel} failed. ${impacted.length} downstream ${
        impacted.length === 1 ? "job is" : "jobs are"
      } impacted: ${impacted.join(", ")}.`,
    zeroDownstream: (failedLabel) => `${failedLabel} failed. 0 downstream jobs affected.`,
  },
} satisfies WorkCopy;
