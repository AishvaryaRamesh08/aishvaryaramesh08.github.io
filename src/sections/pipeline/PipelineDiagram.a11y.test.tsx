// Fuller unit suite for the Pipeline_Diagram (Req 11, task 11.5). The light example tests in
// `PipelineDiagram.test.tsx` already cover collapsed-on-first-render, the six named buttons in
// order, the one-open invariant, the verbatim explanation and the grounding note. This file covers
// the remaining Req 11 contracts under jsdom: keyboard operation (Tab order, Enter AND Space
// toggle, focus staying on the node after collapse — Req 11.3, 11.8, 11.9), a single glow at a
// time (Req 11.6), the exact stage names/order (Req 11.2), the decorative aria-hidden connectors
// pointing toward Insights / AI (Req 11.5, 11.10), the visually hidden text alternative (Req 11.8),
// reduced-motion leaving expand/collapse instant with static arrows present (Req 11.10), the
// labelled placeholder stage (Req 11.11), and SSR output including all six stages + grounding note.
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ui } from "../../data/ui";
import { pipeline } from "../../data/pipeline";
import PipelineDiagram from "./PipelineDiagram";

const STAGE_NAMES = ["Source", "Raw", "Staging", "Sanitized", "Conformed", "Insights / AI"] as const;

afterEach(() => {
  cleanup();
  vi.resetModules();
});

describe("PipelineDiagram — stage names and order (Req 11.2)", () => {
  it("names the six stages exactly, in order", () => {
    render(<PipelineDiagram />);
    const names = screen.getAllByRole("button").map((b) => b.textContent?.trim());
    expect(names).toEqual([...STAGE_NAMES]);
  });
});

describe("PipelineDiagram — keyboard operation (Req 11.3, 11.8, 11.9)", () => {
  it("reaches every stage button by Tab in stage order", async () => {
    const user = userEvent.setup();
    render(<PipelineDiagram />);
    const buttons = screen.getAllByRole("button");

    for (const button of buttons) {
      await user.tab();
      expect(button).toHaveFocus();
    }
  });

  it("toggles a stage with Enter (expand then collapse), leaving focus on the node", async () => {
    const user = userEvent.setup();
    render(<PipelineDiagram />);
    const staging = screen.getByRole("button", { name: /staging/i });

    staging.focus();
    await user.keyboard("{Enter}");
    expect(staging).toHaveAttribute("aria-expanded", "true");
    expect(staging).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(staging).toHaveAttribute("aria-expanded", "false");
    // Collapsing leaves nothing active and keeps focus on the node (Req 11.9, 12.6-style).
    expect(staging).toHaveFocus();
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0);
  });

  it("toggles a stage with Space (expand then collapse), leaving focus on the node", async () => {
    const user = userEvent.setup();
    render(<PipelineDiagram />);
    const conformed = screen.getByRole("button", { name: /conformed/i });

    conformed.focus();
    await user.keyboard(" ");
    expect(conformed).toHaveAttribute("aria-expanded", "true");
    expect(conformed).toHaveFocus();

    await user.keyboard(" ");
    expect(conformed).toHaveAttribute("aria-expanded", "false");
    expect(conformed).toHaveFocus();
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0);
  });
});

describe("PipelineDiagram — single glow (Req 11.6)", () => {
  it("keeps at most one stage with aria-expanded=true (the glow), carrying the glow utility", async () => {
    const user = userEvent.setup();
    render(<PipelineDiagram />);
    const [source, raw] = [
      screen.getByRole("button", { name: /source/i }),
      screen.getByRole("button", { name: /^raw$/i }),
    ];

    // The active-stage glow is styled via the aria-expanded: state variant on the trigger.
    expect(source.className).toContain("aria-expanded:shadow-glow-cyan");

    await user.click(source);
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);

    await user.click(raw);
    const open = screen.getAllByRole("button", { expanded: true });
    expect(open).toHaveLength(1);
    expect(open[0]).toBe(raw);
  });
});

describe("PipelineDiagram — connectors are decorative and directional (Req 11.5, 11.10)", () => {
  it("marks every connector aria-hidden so they are not in the accessibility tree", () => {
    const { container } = render(<PipelineDiagram />);
    const svgs = Array.from(container.querySelectorAll("svg"));
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      // The connector wrapper is aria-hidden; the svg itself is presentational.
      expect(svg.closest("[aria-hidden='true']")).not.toBeNull();
    }
  });

  it("renders exactly one connector pair between each adjacent stage (five gaps, row + column each)", () => {
    const { container } = render(<PipelineDiagram />);
    // Each gap renders a row connector and a column connector -> 2 svgs per gap, 5 gaps.
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength((pipeline.stages.length - 1) * 2);
  });

  it("includes a static arrowhead path (the always-present directional cue toward Insights / AI)", () => {
    const { container } = render(<PipelineDiagram />);
    const svg = container.querySelector("svg")!;
    // Shaft + arrowhead paths are always present, independent of motion.
    const paths = svg.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
    const arrowhead = Array.from(paths).some((p) => /L42 12/.test(p.getAttribute("d") ?? ""));
    expect(arrowhead).toBe(true);
  });
});

describe("PipelineDiagram — text alternative (Req 11.8)", () => {
  it("exposes a visually hidden listing of the stage flow in order", () => {
    render(<PipelineDiagram />);
    const flow = STAGE_NAMES.join(" → ");
    expect(screen.getByText(new RegExp(flow.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
  });
});

describe("PipelineDiagram — reduced motion (Req 11.10)", () => {
  it("keeps expand/collapse instant and the static arrows present; the flow dot is still in the DOM", async () => {
    // The global `html[data-motion="reduced"] *` rule strips the particle animation; the dot
    // element and the static arrowheads remain. We assert DOM structure, not computed animation.
    document.documentElement.setAttribute("data-motion", "reduced");
    try {
      const user = userEvent.setup();
      const { container } = render(<PipelineDiagram />);

      const source = screen.getByRole("button", { name: /source/i });
      await user.click(source);
      // Expand is a plain state change (no animated transition to wait on).
      expect(source).toHaveAttribute("aria-expanded", "true");
      await user.click(source);
      expect(source).toHaveAttribute("aria-expanded", "false");

      // Static directional cue (arrowhead path) and the flow dot element are both present.
      const svg = container.querySelector("svg")!;
      expect(svg.querySelector("path")).not.toBeNull();
      expect(container.querySelector(".pipeline-flow-dot")).not.toBeNull();
    } finally {
      document.documentElement.removeAttribute("data-motion");
    }
  });
});

describe("PipelineDiagram — placeholder stage (Req 11.11)", () => {
  it("renders a labelled PlaceholderAsset for a stage with no explanation while other stages still render", async () => {
    vi.resetModules();
    // Make the Staging stage explanation a Placeholder; leave the rest as real strings.
    vi.doMock("../../data/pipeline", () => ({
      pipeline: {
        stages: [
          { id: "source", name: "Source", explanation: "Operational systems and APIs." },
          { id: "raw", name: "Raw", explanation: "An unchanged landing copy." },
          {
            id: "staging",
            name: "Staging",
            explanation: { placeholder: true, expected: "Staging stage explanation" },
          },
          { id: "sanitized", name: "Sanitized", explanation: "PII handling happens here." },
          { id: "conformed", name: "Conformed", explanation: "Modeled to shared keys." },
          { id: "insights-ai", name: "Insights / AI", explanation: "Dashboards and AI read conformed data." },
        ],
        groundingNote: "Grounded in a layered ELT architecture.",
      },
    }));

    const user = userEvent.setup();
    const { default: Mocked } = await import("./PipelineDiagram");
    render(<Mocked />);

    // Other stages still render as named buttons.
    for (const name of STAGE_NAMES) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name.replace("/", "\\/")}$`, "i") })).toBeInTheDocument();
    }

    const staging = screen.getByRole("button", { name: /^staging$/i });
    const panel = document.getElementById(staging.getAttribute("aria-controls")!)!;
    await user.click(staging);

    // The placeholder renders in the expanded area, labelled with the expected asset name. The
    // label text ("Placeholder" / ": " / expected) is split across spans, so assert on the
    // placeholder element (carrying the expected name on data-placeholder) and the word.
    const placeholder = within(panel).getByText(ui.placeholder);
    const host = placeholder.closest("[data-placeholder]")!;
    expect(host).toHaveAttribute("data-placeholder", "Staging stage explanation");
    expect(host).toHaveTextContent(`${ui.placeholder}: Staging stage explanation`);
  });
});

describe("PipelineDiagram — server render (SSR)", () => {
  it("includes all six stage names and the grounding note in the prerendered HTML", () => {
    const html = renderToString(<PipelineDiagram />);
    for (const name of STAGE_NAMES) {
      expect(html).toContain(name);
    }
    expect(html).toContain(pipeline.groundingNote);
  });
});
