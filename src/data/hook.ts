/**
 * Screen 1, The Hook (Req 8). The panel metadata is reused by the Viz_Showcase stages.
 */
import type { HookConfig, HookImages } from "./types";

export const hook = {
  headline: { before: "I turn complex data", after: "into trusted decisions." },
  subline: "I'm Aishvarya. I build reliable pipelines that help people trust their data.",
  primaryCta: { label: "Meet the engineer ↓", target: "home" },
  secondaryCta: { label: "Explore featured work", target: "work" },
} satisfies HookConfig;

export const hookImages = {
  hookBefore: {
    width: 1200,
    height: 589,
    alt: "Before: a raw CSV preview of synthetic SAMPLE stock data with nulls, a duplicate row, inconsistent formats and ticker casing.",
    image: { placeholder: true, expected: "Raw CSV preview of the bundled synthetic stock data" },
  },
  hookAfter: {
    width: 1200,
    height: 589,
    alt: "Interactive Plotly chart of the same synthetic SAMPLE closing prices and daily OHLC data, switchable between line and candlestick views.",
    image: {
      placeholder: true,
      expected: "Interactive Plotly line/candlestick chart using the bundled sample data",
    },
  },
} satisfies HookImages;
