/**
 * Live_Chart_Demo settings (Req 15). The dataset is synthetic, generated from the fixed seed by
 * scripts/generate-ohlc.ts and bundled at public/data/ohlc-sample.json (Req 15.1, 15.11).
 */
import type { LiveDemoConfig } from "./types";

export const liveDemo = {
  seed: 20260418,
  symbol: "SAMPLE",
  startDate: "2026-01-02",
  tradingDays: 180,
  startPrice: 100,
  drift: 0.0004,
  volatility: 0.015,
  datasetPath: "data/ohlc-sample.json",
  rangeButtons: [
    { label: "1M", count: 1, step: "month" },
    { label: "3M", count: 3, step: "month" },
    { label: "All", all: true },
  ],
  description:
    "Candlestick chart of synthetic sample data: made-up daily open, high, low and close prices for a fictional ticker, SAMPLE, generated from a fixed seed.",
} satisfies LiveDemoConfig;
