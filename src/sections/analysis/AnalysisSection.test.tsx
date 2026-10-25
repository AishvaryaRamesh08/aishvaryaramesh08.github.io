// Analysis section tests: its practices, coursework and case challenge remain visible, while the
// analysis/design artifact gallery is no longer part of the page.
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { analysis } from "../../data/analysis";
import AnalysisSection from "./AnalysisSection";

/** Renders the body inside a real labelled section, matching how SectionShell wraps it. */
function renderInSection() {
  return render(
    <section id="analysis" aria-labelledby="analysis-heading">
      <h2 id="analysis-heading">Analysis</h2>
      <AnalysisSection />
    </section>,
  );
}

describe("AnalysisSection", () => {
  it("renders the five analysis practices and their descriptions from the config", () => {
    renderInSection();
    for (const item of analysis.items) {
      expect(screen.getByRole("heading", { name: item.title, level: 4 })).toBeInTheDocument();
      expect(screen.getByText(item.description)).toBeInTheDocument();
    }
    expect(analysis.items).toHaveLength(5);
  });

  it("omits the analysis and design artifact gallery", () => {
    renderInSection();
    expect(screen.queryByText("Analysis and design artifacts")).toBeNull();
    for (const artifact of analysis.artifacts) {
      expect(screen.queryByRole("button", { name: new RegExp(artifact.caption, "i") })).toBeNull();
    }
  });

  it("shows the courses and the team case challenge as visible text", () => {
    renderInSection();
    for (const course of analysis.courses) {
      expect(screen.getByText(course)).toBeInTheDocument();
    }
    expect(screen.getByText(analysis.caseChallenge)).toBeInTheDocument();
  });

  it("renders the retained analysis content in prerendered HTML", () => {
    const html = renderToString(
      <section id="analysis" aria-labelledby="analysis-heading">
        <h2 id="analysis-heading">Analysis</h2>
        <AnalysisSection />
      </section>,
    );
    expect(html).not.toContain("Analysis and design artifacts");
    expect(html).toContain(analysis.caseChallenge);
  });
});
