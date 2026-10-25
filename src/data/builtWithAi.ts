/**
 * Built with AI: how this site was made (Req 20). Per-step entries and the prompt example and
 * screenshots are Owner-supplied and render as Placeholder_Assets until filled in (Req 20.4).
 *
 * The requirements.md and tasks.md excerpts are copied verbatim from this project's spec
 * (.kiro/specs/portfolio-website/), with line breaks and indentation preserved (Req 20.7).
 */
import type { BuiltWithAiConfig, Placeholder, TimelineStep } from "./types";

const pending = (step: string, entry: string): Placeholder => ({
  placeholder: true,
  expected: `${step}: ${entry}`,
});

const step = (title: string): TimelineStep => ({
  title,
  aiDid: pending(title, "what the AI did"),
  ownerDecided: pending(title, "what I decided or reviewed"),
  ownerLearned: pending(title, "what I learned"),
});

const requirementsExcerpt = [
  "### Requirement 24: Terminal Widget",
  "",
  "**User Story:** As an engineer, I want a terminal widget, so that I can explore the Owner's profile the way I use my own tools.",
  "",
  "#### Acceptance Criteria",
  "",
  "1. THE Terminal_Widget SHALL accept typed commands in a single-line text input with a visible label, styled in JetBrains Mono, and SHALL submit the entered text when the Visitor presses Enter.",
  "5. FOR ALL input strings, THE Terminal_Widget SHALL produce the same output for the string as for the string converted to lowercase with leading and trailing whitespace removed (normalization property).",
].join("\n");

const tasksExcerpt = [
  "- [ ] 16. Terminal_Band",
  "  - [ ] 16.1 Implement terminal command logic",
  "    - `src/lib/terminal.ts`: `normalizeCommand` (trim + lowercase), `runCommand(input, ctx)` producing `append | clear | noop` from the Content_Config",
  "    - _Requirements: 24.2, 24.3, 24.4, 24.5, 24.7, 24.8, 24.9, 24.10_",
  "",
  "  - [ ] 16.2 Write property test for command normalization",
  "    - **Property 16: Command normalization**",
  "    - **Validates: Requirements 24.5**",
].join("\n");

export const builtWithAi = {
  intro:
    "I built this site with AI, guided by specs. Kiro drafted requirements, design and tasks from my direction and wrote code task by task; I reviewed and verified the output at each step.",
  steps: [
    step("Idea"),
    step("Requirements (spec-driven in Kiro)"),
    step("Design"),
    step("Task execution"),
    step("Review and refinement"),
    step("CI/CD to GitHub Pages"),
    step("Live"),
  ],
  artifacts: {
    requirementsExcerpt,
    tasksExcerpt,
    promptExample: { placeholder: true, expected: "prompt example" },
    kiroScreenshot: { placeholder: true, expected: "Kiro workflow screenshot", width: 1600, height: 1000 },
    actionsScreenshot: { placeholder: true, expected: "GitHub Actions run screenshot", width: 1600, height: 1000 },
    captions: {
      requirements: "Excerpt from requirements.md",
      tasks: "Excerpt from tasks.md",
      prompt: "Prompt example",
      kiro: "Kiro workflow screenshot",
      actions: "GitHub Actions run screenshot",
    },
  },
  // Owner to review and rewrite in her own words before release (Req 31.6).
  reflection: {
    didWell: [
      "Turning rough notes into requirements with testable acceptance criteria.",
      "Debugging: reading test failures and proposing focused fixes.",
      "Running accessibility checks and flagging missing labels and focus issues.",
    ],
    steppedIn: [
      "Performance tuning: deciding what to lazy-load and holding the page-weight budget.",
      "Keeping design consistent across sections: tokens, spacing and motion rules.",
      "Checking every number and title against my resume.",
    ],
  },
} satisfies BuiltWithAiConfig;
