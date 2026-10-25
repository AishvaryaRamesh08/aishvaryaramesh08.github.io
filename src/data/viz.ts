/**
 * Viz_Showcase stages (Req 14). Stages 1 and 2 reuse the hook entries, so there are no duplicate
 * image files (Req 4.7, 14.2). Stage 4 (Dash + conversational assistant) is omitted until the
 * Owner supplies its screenshot; the showcase then renders three stages only (Req 14.4).
 *
 * To supply Stage 3, add the image under src/assets/viz/ and replace the placeholder with
 * `{ src: "viz/stage3-dash.webp", width, height, alt }`.
 */
import type { VizConfig } from "./types";

export const viz = {
  stages: [
    {
      number: 1,
      name: "Raw CSV",
      media: { kind: "hook", key: "hookBefore" },
      callouts: ["Baseline: a messy raw CSV with duplicate rows, missing values and inconsistent formats."],
      changes: [
        "Started with raw synthetic OHLC rows before cleaning or normalization.",
        "Made nulls, duplicates, mixed date formats and ticker casing visible.",
      ],
    },
    {
      number: 2,
      name: "Plotly",
      media: { kind: "hook", key: "hookAfter" },
      callouts: ["Customization: switch the same sample data between a closing-price line and candlestick chart."],
      changes: [
        "Reused the same synthetic OHLC sample data shown in the raw CSV preview.",
        "Added a dropdown to switch between a closing-price line and an OHLC candlestick view.",
        "Enabled hover values, pan and zoom with Plotly controls.",
      ],
    },
    {
      number: 3,
      name: "Dash",
      media: {
        kind: "image",
        asset: { placeholder: true, expected: "Stage 3 Dash dashboard screenshot (viz/stage3-dash.webp)", width: 1200, height: 800 },
      },
      callouts: ["Layout and hierarchy: controls on top, linked charts below, one clear focal chart."],
      changes: [
        "Composed the charts into a Dash layout with filter controls.",
        "Linked the charts so one selection updates every view.",
        "Set type, spacing and color hierarchy so the key number reads first.",
      ],
    },
  ],
  // dashDemoUrl: set to an https:// URL to show the "open the Dash demo" link (Req 14.12).
} satisfies VizConfig;
