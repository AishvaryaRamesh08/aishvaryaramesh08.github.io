// Light example tests for the Skill_Constellation (Req 17). The full suite is task 14.6; these
// cover the non-obvious contracts the component wires up: cluster labels render, every distinct
// skill is a single focusable control named with its clusters, focusing a skill highlights its
// projects and related skills, Escape clears the highlight, a skill with no project shows the
// note, and the screen-reader listing is always present (even in the prerendered HTML).
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillId } from "../../data/types";
import { skills } from "../../data/skills";
import { projects } from "../../data/projects";
import { distinctSkillIds, skillAccessibleName } from "../../lib/skills";
import SkillConstellation from "./SkillConstellation";

/** Renders the body inside a real labelled section, matching how SectionShell wraps it. */
function renderInSection() {
  return render(
    <section id="skills" aria-labelledby="skills-heading">
      <h2 id="skills-heading">Skills</h2>
      <SkillConstellation />
    </section>,
  );
}

beforeEach(() => {
  // Desktop graph branch: neither the mobile nor the tablet query matches, so hover is enabled.
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

describe("SkillConstellation", () => {
  it("labels every cluster from the config", () => {
    renderInSection();
    for (const cluster of skills.clusters) {
      expect(screen.getAllByText(cluster.name).length).toBeGreaterThan(0);
    }
  });

  it("renders exactly one control per distinct skill, named with its cluster names", () => {
    renderInSection();
    const ids = distinctSkillIds(skills);
    for (const id of ids) {
      const name = skillAccessibleName(id, skills);
      expect(screen.getByRole("button", { name })).toBeInstanceOf(HTMLButtonElement);
    }
    // BigQuery belongs to two clusters but is a single node (Req 17.3).
    const bigquery = screen.getAllByRole("button", { name: skillAccessibleName("bigquery", skills) });
    expect(bigquery).toHaveLength(1);
    expect(bigquery[0].getAttribute("aria-label")).toContain("Cloud");
    expect(bigquery[0].getAttribute("aria-label")).toContain("Databases");
  });

  it("does not present skills as progress bars or percentages", () => {
    renderInSection();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("highlights the projects that used a skill when it is focused, and clears on Escape", async () => {
    const user = userEvent.setup();
    renderInSection();

    const python = screen.getByRole("button", { name: skillAccessibleName("python", skills) });
    fireEvent.focus(python);

    // Python is used by the cloud-migration and stock-analysis Case_Studies; the visible selection
    // panel (an aria-live region) lists their titles.
    const panel = screen.getByRole("complementary", { name: /featured work/i });
    const pythonId: SkillId = "python";
    const usedTitles = projects
      .filter((p) => (p.tech as readonly SkillId[]).includes(pythonId))
      .map((p) => p.title);
    expect(usedTitles.length).toBeGreaterThan(0);
    for (const title of usedTitles) {
      expect(within(panel).getByText(title)).toBeInTheDocument();
    }

    await user.keyboard("{Escape}");
    expect(screen.getByText(/select a skill/i)).toBeInTheDocument();
  });

  it("shows the no-featured-project note for a skill no project uses", () => {
    renderInSection();
    // SSIS appears in no Case_Study tech list.
    const ssisId: SkillId = "ssis";
    const used = projects.some((p) => (p.tech as readonly SkillId[]).includes(ssisId));
    expect(used).toBe(false);

    const ssis = screen.getByRole("button", { name: skillAccessibleName("ssis", skills) });
    fireEvent.focus(ssis);
    const panel = screen.getByRole("complementary", { name: /featured work/i });
    expect(within(panel).getByText(/no featured project currently uses this skill/i)).toBeInTheDocument();
  });

  it("includes the screen-reader skill listing in the prerendered HTML", () => {
    const html = renderToString(
      <section id="skills" aria-labelledby="skills-heading">
        <h2 id="skills-heading">Skills</h2>
        <SkillConstellation />
      </section>,
    );
    // Every cluster name and a representative skill/project pairing are present without interaction.
    for (const cluster of skills.clusters) {
      expect(html).toContain(cluster.name);
    }
    expect(html).toContain("Migrating 50+ tables to the cloud");
    expect(html).toContain("No featured project currently uses this skill.");
  });
});
