import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { certifications } from "../../data/certifications";
import { skills } from "../../data/skills";
import { work } from "../../data/work";
import { distinctSkillIds, skillAccessibleName } from "../../lib/skills";
import SkillConstellation from "./SkillConstellation";

function renderInSection() {
  return render(
    <section id="skills" aria-labelledby="skills-heading">
      <h2 id="skills-heading">Skills</h2>
      <SkillConstellation />
    </section>,
  );
}

describe("SkillConstellation", () => {
  it("renders all configured skill clusters and certifications", () => {
    renderInSection();
    for (const cluster of skills.clusters) expect(screen.getByText(cluster.name)).toBeInTheDocument();
    for (const cert of certifications) {
      expect(screen.getAllByText(cert.issuer).length).toBeGreaterThan(0);
      expect(screen.getByText(cert.name)).toBeInTheDocument();
      expect(screen.getByText(cert.description)).toBeInTheDocument();
    }
  });

  it("renders every skill as a wrapping focusable control and preserves BigQuery's shared membership", () => {
    renderInSection();
    for (const id of distinctSkillIds(skills)) {
      expect(screen.getAllByRole("button", { name: skillAccessibleName(id, skills) }).length).toBeGreaterThan(0);
    }
    const bigquery = screen.getAllByRole("button", { name: skillAccessibleName("bigquery", skills) });
    expect(bigquery).toHaveLength(2);
    expect(bigquery[0].getAttribute("aria-label")).toContain("Cloud");
    expect(bigquery[0].getAttribute("aria-label")).toContain("Databases");
    expect(screen.getByText("Stakeholder communication")).toHaveClass("whitespace-normal");
  });

  it("shows related skills and only featured work using the focused skill", async () => {
    const user = userEvent.setup();
    renderInSection();
    const panel = screen.getByRole("complementary", { name: /featured work/i });
    expect(within(panel).getByText("Select a skill to see where I've used it.")).toBeInTheDocument();

    fireEvent.focus(screen.getAllByRole("button", { name: skillAccessibleName("python", skills) })[0]);
    const expectedTitles = work.featured
      .filter((item) => item.tech.some((tech) => tech.id === "python"))
      .map((item) => item.title);
    expect(expectedTitles.length).toBeGreaterThan(0);
    for (const title of expectedTitles) expect(within(panel).getByText(title)).toBeInTheDocument();
    expect(within(panel).getByText(/sql/i)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(within(panel).getByText("Select a skill to see where I've used it.")).toBeInTheDocument();
  });

  it("updates the detail strip for tap and shows the no-work message when appropriate", async () => {
    const user = userEvent.setup();
    renderInSection();
    await user.click(screen.getAllByRole("button", { name: skillAccessibleName("ssis", skills) })[0]);
    expect(screen.getByText("No featured work currently uses this skill.")).toBeInTheDocument();
  });

  it("keeps hover details visible while the pointer moves within the skill card", () => {
    renderInSection();
    const python = screen.getAllByRole("button", { name: skillAccessibleName("python", skills) })[0];
    const panel = screen.getByRole("complementary", { name: /featured work/i });
    fireEvent.pointerEnter(python, { pointerType: "mouse" });
    fireEvent.pointerLeave(python, { pointerType: "mouse", relatedTarget: panel });
    expect(within(panel).queryByText("Select a skill to see where I've used it.")).toBeNull();
    fireEvent.pointerLeave(panel.parentElement!, { pointerType: "mouse" });
    expect(within(panel).getByText("Select a skill to see where I've used it.")).toBeInTheDocument();
  });

  it("renders the skill groups in server-rendered markup", () => {
    const html = renderToString(<SkillConstellation />);
    for (const cluster of skills.clusters) expect(html).toContain(cluster.name);
    expect(html).toContain("Select a skill to see where I&#x27;ve used it.");
  });
});
