// Light example tests for the Built_With_AI_Section (Req 20). The full suite is task 18.2; these
// cover the non-obvious contracts implemented here: the intro statement, the seven timeline steps
// in exact order each with three labelled entries (placeholders where an entry is missing), and
// the two-part reflection rendering every item. Owner copy comes from `data/builtWithAi.ts`.
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { builtWithAi } from "../../data/builtWithAi";
import { isPlaceholder } from "../../data/types";
import BuiltWithAi from "./BuiltWithAi";
import { builtWithAiCopy, STEP_ENTRY_KEYS, STEP_ENTRY_LABEL } from "./copy";

/** Renders the body inside a real labelled section, matching how SectionShell wraps it. */
function renderInSection() {
  return render(
    <section id="built-with-ai" aria-labelledby="built-with-ai-heading">
      <h2 id="built-with-ai-heading">Built with AI</h2>
      <BuiltWithAi />
    </section>,
  );
}

const EXPECTED_STEP_ORDER = [
  "Idea",
  "Requirements (spec-driven in Kiro)",
  "Design",
  "Task execution",
  "Review and refinement",
  "CI/CD to GitHub Pages",
  "Live",
] as const;

describe("BuiltWithAi", () => {
  it("shows the spec-guided / reviewed-and-verified intro statement from the config", () => {
    renderInSection();
    expect(screen.getByText(builtWithAi.intro)).toBeInTheDocument();
  });

  it("renders exactly the seven steps in the required order", () => {
    renderInSection();
    expect(builtWithAi.steps.map((s) => s.title)).toEqual([...EXPECTED_STEP_ORDER]);

    const listItems = screen.getAllByRole("listitem");
    const stepHeadings = screen
      .getAllByRole("heading", { level: 4 })
      .map((h) => h.textContent);
    expect(stepHeadings).toEqual([...EXPECTED_STEP_ORDER]);
    // At least the seven step cards are present (the two reflection lists add more list items).
    expect(listItems.length).toBeGreaterThanOrEqual(EXPECTED_STEP_ORDER.length);
  });

  it("shows the three labelled entries for every step, with a placeholder where an entry is missing", () => {
    const { container } = renderInSection();
    for (const label of Object.values(STEP_ENTRY_LABEL)) {
      // One label per step.
      expect(screen.getAllByText(label)).toHaveLength(builtWithAi.steps.length);
    }
    // Every entry is currently a placeholder in the config, so a labelled placeholder naming the
    // step and entry stands in its place (Req 20.4).
    for (const step of builtWithAi.steps) {
      for (const key of STEP_ENTRY_KEYS) {
        if (isPlaceholder(step[key])) {
          const expected = `${step.title} — ${STEP_ENTRY_LABEL[key]}`;
          expect(container.querySelector(`[data-placeholder="${expected}"]`)).not.toBeNull();
        }
      }
    }
  });

  it("renders the reflection as two labelled lists covering every item", () => {
    renderInSection();
    expect(screen.getByText(builtWithAiCopy.didWellLabel)).toBeInTheDocument();
    expect(screen.getByText(builtWithAiCopy.steppedInLabel)).toBeInTheDocument();
    for (const item of [...builtWithAi.reflection.didWell, ...builtWithAi.reflection.steppedIn]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("names each of the four required reflection topics at least once (Req 20.5)", () => {
    renderInSection();
    for (const topic of [/debugging/i, /accessibility/i, /performance/i, /design consistent/i]) {
      expect(screen.getAllByText(topic).length).toBeGreaterThan(0);
    }
  });

  it("prerenders the intro and all step titles in the server HTML (SSR-safe)", () => {
    const html = renderToString(
      <section id="built-with-ai" aria-labelledby="built-with-ai-heading">
        <h2 id="built-with-ai-heading">Built with AI</h2>
        <BuiltWithAi />
      </section>,
    );
    expect(html).toContain(builtWithAi.intro);
    for (const title of EXPECTED_STEP_ORDER) {
      expect(html).toContain(title);
    }
  });
});
