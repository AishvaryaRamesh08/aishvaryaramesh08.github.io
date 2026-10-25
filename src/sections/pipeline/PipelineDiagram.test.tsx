// Light example tests for the Pipeline_Diagram (Req 11). The full suite is task 11.5; these cover
// the non-obvious contracts: everything is collapsed on first render, the six stages are exposed
// as named buttons in order, activation expands one and collapses the previous (at most one glow),
// and the grounding note is present.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { pipeline } from "../../data/pipeline";
import PipelineDiagram from "./PipelineDiagram";

describe("PipelineDiagram", () => {
  it("renders the six stages as collapsed buttons in order on first render (Req 11.1, 11.8)", () => {
    render(<PipelineDiagram />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(pipeline.stages.length);
    pipeline.stages.forEach((stage, index) => {
      expect(buttons[index]).toHaveAccessibleName(expect.stringContaining(stage.name));
      expect(buttons[index]).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("expands one stage and collapses any previous one on activation (Req 11.3, 11.6, 11.9)", async () => {
    const user = userEvent.setup();
    render(<PipelineDiagram />);

    const source = screen.getByRole("button", { name: /source/i });
    const raw = screen.getByRole("button", { name: /^raw$/i });

    await user.click(source);
    expect(source).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);

    // Opening another collapses the first: still at most one expanded (and so one glow).
    await user.click(raw);
    expect(source).toHaveAttribute("aria-expanded", "false");
    expect(raw).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);

    // Activating the open stage collapses it, leaving none expanded (Req 11.9).
    await user.click(raw);
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0);
  });

  it("reveals the stage explanation verbatim when expanded (Req 11.3)", async () => {
    const user = userEvent.setup();
    render(<PipelineDiagram />);

    const staging = pipeline.stages.find((s) => s.name === "Staging")!;
    const button = screen.getByRole("button", { name: /staging/i });
    const panel = document.getElementById(button.getAttribute("aria-controls")!)!;

    expect(panel).not.toBeVisible();
    await user.click(button);
    expect(panel).toBeVisible();
    expect(within(panel).getByText(staging.explanation as string)).toBeInTheDocument();
  });

  it("shows the grounding note (Req 11.7)", () => {
    render(<PipelineDiagram />);
    expect(screen.getByText(pipeline.groundingNote)).toBeInTheDocument();
  });
});
