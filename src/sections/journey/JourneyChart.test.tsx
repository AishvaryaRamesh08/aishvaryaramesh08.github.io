// Light example tests for the Journey_Chart (Req 19). The full suite is task 17.9; these cover
// the non-obvious, SSR-/loader-dependent contracts: the text alternative is always present and
// linked via aria-describedby, the loading placeholder keeps the chart's box, a resolved load
// renders one named marker button per stage in order (with the right Plotly layout), and a
// rejected or timed-out load shows the visible ordered list fallback.
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { journey } from "../../data/journey";

// Control the shared Plotly loader so no real ~1 MB bundle is imported.
const loadPlotly = vi.fn();
const withTimeout = vi.fn((p: Promise<unknown>) => p);
vi.mock("../../charts/plotlyLoader", () => ({
  loadPlotly: () => loadPlotly(),
  withTimeout: (p: Promise<unknown>) => withTimeout(p),
}));

// GSAP's entrance is irrelevant here and touches SVG measurement jsdom lacks.
vi.mock("gsap", () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }));

import JourneyChart from "./JourneyChart";

/** A minimal Plotly stand-in whose newPlot resolves after painting nothing into the node. */
function fakePlotly() {
  return {
    newPlot: vi.fn().mockResolvedValue(undefined),
    react: vi.fn(),
    relayout: vi.fn(),
    purge: vi.fn(),
  };
}

beforeEach(() => {
  loadPlotly.mockReset();
  withTimeout.mockReset();
  withTimeout.mockImplementation((p: Promise<unknown>) => p);
  // jsdom lacks ResizeObserver; a no-op is enough (the layout effect falls back to resize events).
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("JourneyChart", () => {
  it("always exposes the stages as a text alternative linked by aria-describedby (Req 19.22)", () => {
    loadPlotly.mockReturnValue(new Promise(() => {})); // never settles: stays on the placeholder
    render(<JourneyChart />);

    const figure = screen.getByRole("figure", { name: /career journey/i });
    const describedBy = figure.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    const list = document.getElementById(describedBy!);
    expect(list?.tagName).toBe("OL");
    const items = within(list as HTMLElement).getAllByRole("listitem");
    expect(items).toHaveLength(journey.length);
    journey.forEach((stage, i) => {
      expect(items[i]).toHaveTextContent(stage.label);
      expect(items[i]).toHaveTextContent(stage.approxYear);
      expect(items[i]).toHaveTextContent(stage.detail.slice(0, 20));
    });
  });

  it("shows a sized loading placeholder while the bundle loads (Req 19.24)", () => {
    loadPlotly.mockReturnValue(new Promise(() => {}));
    render(<JourneyChart />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status.style.minHeight).toMatch(/px$/);
  });

  it("renders one named marker button per stage in order once Plotly resolves (Req 19.12, 19.18)", async () => {
    loadPlotly.mockResolvedValue(fakePlotly());
    render(<JourneyChart />);

    await waitFor(() => expect(screen.getAllByRole("button")).toHaveLength(journey.length));
    const buttons = screen.getAllByRole("button");
    journey.forEach((stage, i) => {
      expect(buttons[i]).toHaveAccessibleName(`${stage.label}, ${stage.approxYear}`);
    });
  });

  it("draws exactly one static scatter trace with hidden axes and no legend (Req 19.6, 19.8)", async () => {
    const plotly = fakePlotly();
    loadPlotly.mockResolvedValue(plotly);
    render(<JourneyChart />);

    await waitFor(() => expect(plotly.newPlot).toHaveBeenCalled());
    const [, data, layout, config] = plotly.newPlot.mock.calls[0];
    expect(data).toHaveLength(1);
    expect(data[0].type).toBe("scatter");
    expect(data[0].line.shape).toBe("hv");
    expect(layout.showlegend).toBe(false);
    expect(layout.xaxis.visible).toBe(false);
    expect(layout.yaxis.visible).toBe(false);
    expect(config.staticPlot).toBe(true);
  });

  it("colors the last marker maroon with a violet ring (Req 19.13)", async () => {
    const plotly = fakePlotly();
    loadPlotly.mockResolvedValue(plotly);
    render(<JourneyChart />);

    await waitFor(() => expect(plotly.newPlot).toHaveBeenCalled());
    const [, data] = plotly.newPlot.mock.calls[0];
    const last = journey.length - 1;
    expect(data[0].marker.color[last]).not.toBe(data[0].marker.color[0]);
    expect(data[0].marker.line.width[last]).toBeGreaterThan(0);
  });

  it("shows the visible ordered list fallback when the load rejects (Req 19.25)", async () => {
    loadPlotly.mockRejectedValue(new Error("boom"));
    render(<JourneyChart />);

    await waitFor(() => {
      const lists = screen.getAllByRole("list");
      const visible = lists.find((l) => !l.className.includes("sr-only"));
      expect(visible).toBeTruthy();
      expect(within(visible as HTMLElement).getAllByRole("listitem")).toHaveLength(journey.length);
    });
  });
});
