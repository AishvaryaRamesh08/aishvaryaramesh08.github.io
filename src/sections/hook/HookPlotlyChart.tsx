import { useEffect, useRef, useState } from "react";
import { LoadingPlaceholder } from "../../components/LoadingPlaceholder";
import { liveDemo } from "../../data/liveDemo";
import type { OhlcDataset } from "../../data/types";
import { loadPlotly, withTimeout, type Config, type Data, type Layout, type PlotlyApi } from "../../charts/plotlyLoader";
import { parseOhlcDataset } from "../../lib/ohlc";
import { withBase } from "../../lib/url";

type ChartType = "line" | "candlestick";

interface LoadedChart {
  plotly: PlotlyApi;
  dataset: OhlcDataset;
}

const CHART_LAYOUT: Partial<Layout> = {
  autosize: true,
  paper_bgcolor: "#10172a",
  plot_bgcolor: "#10172a",
  font: { color: "#e6edf7", size: 10 },
  showlegend: false,
};

const CHART_CONFIG: Partial<Config> = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["select2d", "lasso2d"],
};

function chartLayout(width: number): Partial<Layout> {
  const compact = width < 260;
  return {
    ...CHART_LAYOUT,
    margin: compact ? { l: 8, r: 4, t: 36, b: 12 } : { l: 42, r: 12, t: 40, b: 36 },
    xaxis: {
      title: { text: compact ? "" : "Date" },
      gridcolor: "#26324d",
      zerolinecolor: "#26324d",
      showticklabels: !compact,
      rangeselector: {
        buttons: liveDemo.rangeButtons.map((button) =>
          button.all
            ? { step: "all", label: button.label }
            : { count: button.count, step: button.step, label: button.label },
        ),
        bgcolor: "#182238",
        activecolor: "#164e63",
        bordercolor: "#26324d",
        font: { color: "#e6edf7", size: 9 },
      },
      rangeslider: {
        visible: true,
        bgcolor: "#182238",
        bordercolor: "#26324d",
        thickness: 0.12,
      },
    },
    yaxis: {
      title: { text: compact ? "" : "Price (USD)" },
      gridcolor: "#26324d",
      zerolinecolor: "#26324d",
      showticklabels: !compact,
    },
  };
}

function buildTrace(dataset: OhlcDataset, type: ChartType): Data {
  if (type === "line") {
    return {
      type: "scatter",
      mode: "lines",
      name: "Close",
      x: dataset.dates,
      y: dataset.close,
      line: { color: "#22d3ee", width: 2 },
      hovertemplate: "%{x}<br>Close: $%{y:.2f}<extra></extra>",
    };
  }

  return {
    type: "candlestick",
    name: dataset.symbol,
    x: dataset.dates,
    open: dataset.open,
    high: dataset.high,
    low: dataset.low,
    close: dataset.close,
    increasing: { line: { color: "#39ff88" }, fillcolor: "#39ff88" },
    decreasing: { line: { color: "#fb7185" }, fillcolor: "#fb7185" },
    hoverlabel: { namelength: -1 },
  };
}

async function fetchSampleData(): Promise<OhlcDataset> {
  const response = await fetch(withBase(liveDemo.datasetPath));
  if (!response.ok) throw new Error(`Sample chart data request failed with HTTP ${response.status}`);
  return parseOhlcDataset(await response.json());
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function HookPlotlyChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const renderedType = useRef<ChartType>("candlestick");
  const renderedWidth = useRef(0);
  const chartTypeRef = useRef<ChartType>("candlestick");
  const chartWidthRef = useRef(0);
  const updateQueue = useRef(Promise.resolve());
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [chartWidth, setChartWidth] = useState(0);
  const [loaded, setLoaded] = useState<LoadedChart | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const measure = () => {
      const width = Math.round(chart.getBoundingClientRect().width);
      if (width <= 0) return;
      chartWidthRef.current = width;
      setChartWidth(width);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(chart);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let plotly: PlotlyApi | undefined;
    const chart = chartRef.current;
    if (!chart) return;

    void Promise.all([withTimeout(loadPlotly()), fetchSampleData()])
      .then(async ([loadedPlotly, dataset]) => {
        plotly = loadedPlotly;
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        const measuredWidth = Math.round(chart.getBoundingClientRect().width);
        const width = measuredWidth || chartWidthRef.current || 360;
        chartWidthRef.current = width;
        await loadedPlotly.newPlot(
          chart,
          [buildTrace(dataset, "candlestick")],
          chartLayout(width),
          CHART_CONFIG,
        );
        if (cancelled) {
          loadedPlotly.purge(chart);
          return;
        }
        const latestWidth = Math.round(chart.getBoundingClientRect().width) || chartWidthRef.current || width;
        const latestType = chartTypeRef.current;
        if (latestType !== "candlestick" || latestWidth !== width) {
          await loadedPlotly.react(
            chart,
            [buildTrace(dataset, latestType)],
            chartLayout(latestWidth),
            CHART_CONFIG,
          );
        }
        renderedType.current = latestType;
        renderedWidth.current = latestWidth;
        chartWidthRef.current = latestWidth;
        setLoaded({ plotly: loadedPlotly, dataset });
        setReady(true);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(`Chart initialization failed: ${errorMessage(cause)}`);
        }
      });

    return () => {
      cancelled = true;
      if (plotly && chart) plotly.purge(chart);
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !loaded || !chart) return;
    let cancelled = false;
    const update = updateQueue.current.then(async () => {
      if (cancelled) return;
      const requestedType = chartTypeRef.current;
      const requestedWidth = chartWidthRef.current || chartWidth;
      if (renderedType.current === requestedType && renderedWidth.current === requestedWidth) return;
      await loaded.plotly.react(
        chart,
        [buildTrace(loaded.dataset, requestedType)],
        chartLayout(requestedWidth),
        CHART_CONFIG,
      );
      renderedType.current = requestedType;
      renderedWidth.current = requestedWidth;
    });
    updateQueue.current = update.catch((cause: unknown) => {
      if (!cancelled) setError(`Plotly could not update the selected chart: ${errorMessage(cause)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [chartType, chartWidth, loaded, ready]);

  const dateRange =
    loaded && loaded.dataset.dates.length > 0
      ? `${loaded.dataset.dates[0]} to ${loaded.dataset.dates[loaded.dataset.dates.length - 1]}`
      : "bundled sample date range";

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="flex min-h-9 items-center justify-end gap-2 text-xs text-text-muted">
        <span className="sr-only sm:not-sr-only">Chart type</span>
        <select
          aria-label="Plotly chart type"
          className="min-h-9 min-w-0 max-w-full rounded-md border border-border-strong bg-surface px-2 text-text"
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (value === "line" || value === "candlestick") {
              chartTypeRef.current = value;
              setChartType(value);
            }
          }}
          value={chartType}
        >
          <option value="line">Line</option>
          <option value="candlestick">Candlestick</option>
        </select>
      </label>
      <div
        className="relative w-full overflow-hidden rounded-md bg-surface"
        style={{ aspectRatio: `${1200} / ${680}` }}
      >
        <div
          ref={chartRef}
          aria-label={`Interactive ${chartType} chart for synthetic ${liveDemo.symbol} stock data, ${dateRange}`}
          className="absolute inset-0"
          data-testid="hook-plotly-chart"
          role="img"
        />
        {!ready && !error ? (
          <LoadingPlaceholder className="absolute inset-0 w-full" label="Loading interactive chart…" />
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-sm text-text-muted" role="status">
            Interactive sample chart unavailable: {error} The raw CSV comparison remains visible.
          </div>
        ) : null}
      </div>
      <p className="sr-only">
        Interactive chart of synthetic {liveDemo.symbol} daily OHLC prices from {dateRange}. Use the chart type
        dropdown to switch between a closing-price line and candlesticks, the range buttons to select one month,
        three months or all dates, or the range slider to adjust the visible dates.
      </p>
    </div>
  );
}
