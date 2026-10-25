import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { liveDemo } from "../../data/liveDemo";
import { HookPlotlyChart } from "./HookPlotlyChart";

const plotly = vi.hoisted(() => ({
  newPlot: vi.fn(),
  react: vi.fn(),
  relayout: vi.fn(),
  purge: vi.fn(),
}));

vi.mock("../../charts/plotlyLoader", () => ({
  loadPlotly: () => Promise.resolve(plotly),
  withTimeout: (promise: Promise<unknown>) => promise,
}));

const dataset = {
  version: 1 as const,
  seed: 20260418,
  symbol: "SAMPLE",
  dates: ["2026-01-02", "2026-01-05"],
  open: [100, 101],
  high: [102, 103],
  low: [99, 100],
  close: [101, 102],
};

beforeEach(() => {
  plotly.newPlot.mockResolvedValue(undefined);
  plotly.react.mockResolvedValue(undefined);
  plotly.purge.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("HookPlotlyChart", () => {
  it("loads the local sample data and switches between line and candlestick traces", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => dataset,
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<HookPlotlyChart />);

    await waitFor(() => expect(plotly.newPlot).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(liveDemo.datasetPath));
    expect(plotly.newPlot.mock.calls[0][1][0]).toMatchObject({
      type: "candlestick",
      x: dataset.dates,
      open: dataset.open,
      high: dataset.high,
      low: dataset.low,
      close: dataset.close,
    });
    expect(plotly.newPlot.mock.calls[0][2].xaxis).toMatchObject({
      rangeselector: {
        buttons: [
          { label: "1M", count: 1, step: "month" },
          { label: "3M", count: 3, step: "month" },
          { label: "All", step: "all" },
        ],
      },
      rangeslider: { visible: true },
    });
    expect(screen.getByRole("img", { name: /synthetic SAMPLE stock data/ })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Plotly chart type" }), {
      target: { value: "line" },
    });
    await waitFor(() => expect(plotly.react).toHaveBeenCalledOnce());
    expect(plotly.react.mock.calls[0][1][0]).toMatchObject({
      type: "scatter",
      mode: "lines",
      x: dataset.dates,
      y: dataset.close,
    });
  });

  it("shows an explicit fallback if the static dataset cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );
    render(<HookPlotlyChart />);

    expect(
      await screen.findByText(
        "Interactive sample chart unavailable: Chart initialization failed: Sample chart data request failed with HTTP 404 The raw CSV comparison remains visible.",
      ),
    ).toBeInTheDocument();
    expect(plotly.newPlot).not.toHaveBeenCalled();
  });

  it("applies the most recently selected chart type when changes happen during a redraw", async () => {
    let finishLineRender: (() => void) | undefined;
    plotly.react.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishLineRender = resolve;
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => dataset,
      }),
    );
    render(<HookPlotlyChart />);
    await waitFor(() => expect(plotly.newPlot).toHaveBeenCalledOnce());

    const selector = screen.getByRole("combobox", { name: "Plotly chart type" });
    fireEvent.change(selector, { target: { value: "line" } });
    await waitFor(() => expect(plotly.react).toHaveBeenCalledOnce());
    fireEvent.change(selector, { target: { value: "candlestick" } });
    finishLineRender?.();

    await waitFor(() => expect(plotly.react).toHaveBeenCalledTimes(2));
    expect(plotly.react.mock.calls[1][1][0]).toMatchObject({ type: "candlestick" });
  });
});
