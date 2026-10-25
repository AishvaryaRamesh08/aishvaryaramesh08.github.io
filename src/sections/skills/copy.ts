/**
 * Structural microcopy for the Skill_Constellation (Req 17), kept out of the component source the
 * same way the Analysis_Section keeps its labels in `copy.ts`. These are fixed UI labels and
 * sub-headings, not Owner content: every skill name, cluster name and project title comes from
 * `data/skills.ts` and `data/projects.ts` through the pure helpers in `lib/skills.ts`.
 */
export const skillsCopy = {
  /** Intro line above the map, explaining how to explore it (keyboard + pointer, Req 17.4, 17.9). */
  intro:
    "Explore my skills as a connected map. Hover, tap or focus a skill to highlight the skills it shares a cluster with and the featured work that used it.",
  /** Heading for the related-skills panel shown while a skill is selected (Req 17.4). */
  relatedHeading: "Related skills",
  /** Heading for the project rail shown while a skill is selected (Req 17.4). */
  projectsHeading: "Featured work",
  /** Prompt shown in the side panel before any skill is selected. */
  idlePrompt: "Select a skill to see how it connects.",
  /** Heading for the always-present screen-reader listing (Req 17.8). */
  listingHeading: "Skills by cluster",
} as const;
