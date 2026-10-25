// Light example tests for the Featured_Work section (Req 12). The full suite is task 12.7; these
// cover the non-obvious contracts: the seven cards render in `projects.ts` order, the body adds no
// heading (the shell's h2 labels the section), expanding one card shows its five subsections in
// order while keeping at most one card open, and the WIP badge appears on both the card and the
// expanded panel.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { projects } from "../../data/projects";
import { workCopy } from "./copy";
import FeaturedWork from "./FeaturedWork";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The card's trigger button, found by its visible title (titles contain regex-special chars). */
function cardButton(title: string): HTMLButtonElement {
  const buttons = screen.getAllByRole("button") as HTMLButtonElement[];
  const match = buttons.find((b) => b.textContent?.includes(title));
  if (!match) throw new Error(`No card button for "${title}"`);
  return match;
}

describe("FeaturedWork", () => {
  it("renders the seven case-study cards in projects order and no heading of its own", () => {
    render(<FeaturedWork />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(projects.length);
    projects.forEach((project, index) => {
      expect(buttons[index]).toHaveTextContent(project.title);
    });

    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("expands one card into five ordered subsections and keeps at most one open", async () => {
    const user = userEvent.setup();
    render(<FeaturedWork />);

    const first = cardButton(projects[0].title);
    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");

    const panel = document.getElementById(first.getAttribute("aria-controls") as string);
    expect(panel).not.toBeNull();
    const subsectionTitles = within(panel as HTMLElement)
      .getAllByRole("heading", { level: 4 })
      .map((h) => h.textContent);
    expect(subsectionTitles).toEqual([
      workCopy.subsections.challenge,
      workCopy.subsections.approach,
      workCopy.subsections.architecture,
      workCopy.subsections.outcome,
      workCopy.subsections.tech,
    ]);

    // Opening a second card collapses the first (Req 12.2).
    const second = cardButton(projects[1].title);
    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps focus on the card when it collapses (Req 12.6)", async () => {
    const user = userEvent.setup();
    render(<FeaturedWork />);

    const card = cardButton(projects[0].title);
    await user.click(card);
    await user.click(card);
    expect(card).toHaveAttribute("aria-expanded", "false");
    expect(card).toHaveFocus();
  });

  it("shows the work-in-progress badge on the card and in the expanded panel (Req 12.7)", async () => {
    const user = userEvent.setup();
    render(<FeaturedWork />);

    const wip = projects.find((p) => p.workInProgress);
    expect(wip).toBeDefined();

    const card = cardButton((wip as { title: string }).title);
    // On the collapsed card.
    expect(within(card).getByText(workCopy.workInProgress)).toBeInTheDocument();

    await user.click(card);
    const panel = document.getElementById(card.getAttribute("aria-controls") as string);
    expect(within(panel as HTMLElement).getByText(workCopy.workInProgress)).toBeInTheDocument();
  });
});
