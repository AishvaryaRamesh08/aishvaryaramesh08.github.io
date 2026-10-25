// Journey_Chart pure logic (design.md › Charts › Journey_Chart, Req 19). No DOM, no Plotly import:
// the functions return plain trace/layout/config objects and geometry that the JourneyChart
// component hands to `Plotly.newPlot` and to its React-owned overlay.

import type { JourneyStage } from "../data/types";
import type { Theme } from "./theme";

// ---------- Geometry types ----------

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Axis-aligned rectangle: top-left corner plus size, in CSS px. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A container box (same shape as `Rect`). */
export type Box = Rect;

/** Plot margins, named like Plotly's `layout.margin`. */
export interface Margin {
  l: number;
  r: number;
  t: number;
  b: number;
}

// ---------- Constants shared by the trace, the overlay and the label layout ----------

/** Visual marker diameter in CSS px (Req 19.12: ≥ 16). */
export const JOURNEY_MARKER_SIZE = 18;
/** Width of the violet ring on the "current" marker. */
export const JOURNEY_CURRENT_RING_WIDTH = 3;
/** Box used for label-vs-marker overlap: marker plus its ring, rounded up. */
export const JOURNEY_MARKER_BOX = 22;
/** Pointer/touch hit area of each overlay button (Req 19.12: ≥ 44 × 44). */
export const JOURNEY_HIT_AREA = 44;
/** Plot margins; `markerPositions` must use the same values as the Plotly layout. */
export const JOURNEY_MARGIN: Readonly<Margin> = { l: 16, r: 16, t: 32, b: 16 };
/** Gap between a marker box and its label. */
export const JOURNEY_LABEL_GAP = 4;
/**
 * Largest label box `layoutJourneyLabels` guarantees to place without overlap for 1–8 stages in
 * a 320–1920 px wide container whose height is `journeyChartHeight(width)` (Property 15).
 */
export const JOURNEY_LABEL_MAX: Readonly<Size> = { width: 144, height: 20 };
/** Minimum chart height in CSS px. */
export const JOURNEY_MIN_HEIGHT = 240;

/** Chart height for a container width: `max(240px, 0.75 × width)` (design, Req 19.11). */
export function journeyChartHeight(width: number): number {
  return Math.max(JOURNEY_MIN_HEIGHT, 0.75 * width);
}

// ---------- Colors (Plotly cannot read CSS custom properties) ----------

export interface JourneyColors {
  /** Solid step-line color; the cyan→violet gradient is injected after render. */
  line: string;
  /** Fill of every marker except the last. */
  marker: string;
  /** Fill of the last ("current") marker. */
  current: string;
  /** Ring around the current marker. */
  currentRing: string;
}

/** Mirrors `--color-cyan`, `--color-maroon` and `--color-maroon-ring` in tokens.css. */
export const JOURNEY_COLORS: Readonly<Record<Theme, Readonly<JourneyColors>>> = {
  dark: { line: "#22d3ee", marker: "#22d3ee", current: "#7a1f33", currentRing: "#a78bfa" },
  light: { line: "#0891b2", marker: "#0891b2", current: "#500000", currentRing: "#6d28d9" },
};

// ---------- buildJourneyTrace ----------

/** Per-point texts: `[label, approxYear, detail]`. */
export type JourneyPointText = readonly [label: string, approxYear: string, detail: string];

export interface JourneyScatterTrace {
  type: "scatter";
  mode: "lines+markers";
  x: number[];
  y: number[];
  /** Stage labels, one per point. */
  text: string[];
  /** `[label, approxYear, detail]`, one per point. */
  customdata: JourneyPointText[];
  hoverinfo: "none";
  showlegend: false;
  cliponaxis: false;
  line: { shape: "hv"; color: string; width: number };
  marker: {
    size: number;
    color: string[];
    line: { color: string[]; width: number[] };
  };
}

export interface JourneyAxis {
  visible: false;
  range: [number, number];
  fixedrange: true;
  showgrid: false;
  zeroline: false;
  showticklabels: false;
}

export interface JourneyLayout {
  paper_bgcolor: string;
  plot_bgcolor: string;
  showlegend: false;
  hovermode: false;
  dragmode: false;
  autosize: true;
  margin: Margin & { pad: number };
  xaxis: JourneyAxis;
  yaxis: JourneyAxis;
}

export interface JourneyPlotConfig {
  staticPlot: true;
  displayModeBar: false;
  displaylogo: false;
  responsive: true;
  scrollZoom: false;
  doubleClick: false;
}

/** Everything `Plotly.newPlot(el, data, layout, config)` needs. */
export interface JourneyTrace {
  /** Exactly one scatter trace (Req 19.6). */
  data: [JourneyScatterTrace];
  layout: JourneyLayout;
  config: JourneyPlotConfig;
}

const TRANSPARENT = "rgba(0,0,0,0)";

const axis = (n: number): JourneyAxis => ({
  visible: false,
  range: [0.5, n + 0.5],
  fixedrange: true,
  showgrid: false,
  zeroline: false,
  showticklabels: false,
});

/**
 * Maps Journey_Stages to one `hv` step trace: stage k (1-based) at (k, k), so steps ascend left to
 * right on evenly spaced positions (Req 19.6, 19.7, 19.9). Every marker is `colors.marker` except
 * the last, which is `colors.current` with a `colors.currentRing` ring (Req 19.13). Axes, grid,
 * legend and native hover are off; `staticPlot` disables zoom and the modebar (Req 19.8).
 */
export function buildJourneyTrace(
  stages: readonly JourneyStage[],
  colors: Readonly<JourneyColors> = JOURNEY_COLORS.dark,
): JourneyTrace {
  const n = stages.length;
  const last = n - 1;
  const positions = stages.map((_, i) => i + 1);
  const isCurrent = (i: number): boolean => i === last;

  const trace: JourneyScatterTrace = {
    type: "scatter",
    mode: "lines+markers",
    x: positions,
    y: [...positions],
    text: stages.map((s) => s.label),
    customdata: stages.map((s) => [s.label, s.approxYear, s.detail] as const),
    hoverinfo: "none",
    showlegend: false,
    cliponaxis: false,
    line: { shape: "hv", color: colors.line, width: 3 },
    marker: {
      size: JOURNEY_MARKER_SIZE,
      color: stages.map((_, i) => (isCurrent(i) ? colors.current : colors.marker)),
      line: {
        color: stages.map((_, i) => (isCurrent(i) ? colors.currentRing : colors.marker)),
        width: stages.map((_, i) => (isCurrent(i) ? JOURNEY_CURRENT_RING_WIDTH : 0)),
      },
    },
  };

  return {
    data: [trace],
    layout: {
      paper_bgcolor: TRANSPARENT,
      plot_bgcolor: TRANSPARENT,
      showlegend: false,
      hovermode: false,
      dragmode: false,
      autosize: true,
      margin: { ...JOURNEY_MARGIN, pad: 0 },
      xaxis: axis(n),
      yaxis: axis(n),
    },
    config: {
      staticPlot: true,
      displayModeBar: false,
      displaylogo: false,
      responsive: true,
      scrollZoom: false,
      doubleClick: false,
    },
  };
}

// ---------- markerPositions ----------

/**
 * CSS-pixel centers of the n markers inside `box`, given the plot margins. Both axes span the fixed
 * range [0.5, n + 0.5], so stage k sits at the k-th of n equal columns and rows (y grows upward in
 * data space, downward in CSS). Points are in the same coordinate space as `box`.
 */
export function markerPositions(n: number, box: Box, margin: Margin = JOURNEY_MARGIN): Point[] {
  if (n <= 0) return [];
  const plotW = Math.max(0, box.width - margin.l - margin.r);
  const plotH = Math.max(0, box.height - margin.t - margin.b);
  const points: Point[] = [];
  for (let k = 1; k <= n; k++) {
    const frac = (k - 0.5) / n;
    points.push({
      x: box.x + margin.l + frac * plotW,
      y: box.y + margin.t + (1 - frac) * plotH,
    });
  }
  return points;
}

// ---------- layoutJourneyLabels ----------

export type LabelAnchor = "start" | "center" | "end";
export type LabelSide = "above" | "right" | "left";

/** A placed label: top-left corner and size (same space as the points), plus how it was placed. */
export interface LabelBox extends Rect {
  index: number;
  side: LabelSide;
  anchor: LabelAnchor;
}

/** Strict overlap: rectangles that only touch along an edge do not overlap. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** True when `inner` lies fully inside `outer` (edges may touch). */
export function rectInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** The square used for label-vs-marker overlap, centered on a marker point. */
export function markerBox(p: Point, size: number = JOURNEY_MARKER_BOX): Rect {
  return { x: p.x - size / 2, y: p.y - size / 2, width: size, height: size };
}

/** Candidate placements in preference order: above (center, start, end), then beside. */
function candidates(index: number, p: Point, s: Size): LabelBox[] {
  const r = JOURNEY_MARKER_BOX / 2;
  const g = JOURNEY_LABEL_GAP;
  const { width, height } = s;
  const aboveY = p.y - r - g - height;
  const midY = p.y - height / 2;
  return [
    { index, side: "above", anchor: "center", x: p.x - width / 2, y: aboveY, width, height },
    { index, side: "above", anchor: "start", x: p.x - r, y: aboveY, width, height },
    { index, side: "above", anchor: "end", x: p.x + r - width, y: aboveY, width, height },
    { index, side: "right", anchor: "start", x: p.x + r + g, y: midY, width, height },
    { index, side: "left", anchor: "end", x: p.x - r - g - width, y: midY, width, height },
  ];
}

const clampTo = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Places one label per marker (labels[i] belongs to points[i]) so that every label lies inside
 * `bounds`, overlaps no other label and no marker box (Req 19.11). Labels prefer to sit above
 * their marker (center, then start, then end anchoring) and fall back to beside it. A small
 * backtracking search picks the first valid combination in that preference order.
 *
 * Guarantee: with `points = markerPositions(n, bounds)`, n in 1..8, bounds width 320..1920,
 * height `journeyChartHeight(width)` and every size ≤ `JOURNEY_LABEL_MAX`, a valid layout exists
 * (right-of-marker for low stages, above/end-anchored for stages near the right edge). If no valid
 * layout exists for other inputs, each label falls back to its first candidate that fits in
 * `bounds` (or the above/center candidate clamped into `bounds`).
 */
export function layoutJourneyLabels(points: readonly Point[], sizes: readonly Size[], bounds: Box): LabelBox[] {
  const n = Math.min(points.length, sizes.length);
  const markers = points.slice(0, n).map((p) => markerBox(p));
  const options = points.slice(0, n).map((p, i) =>
    candidates(i, p, sizes[i]).filter(
      (c) => rectInside(c, bounds) && !markers.some((m) => rectsOverlap(c, m)),
    ),
  );

  const chosen: LabelBox[] = [];
  const search = (i: number): boolean => {
    if (i === n) return true;
    for (const c of options[i]) {
      if (chosen.some((placed) => rectsOverlap(c, placed))) continue;
      chosen.push(c);
      if (search(i + 1)) return true;
      chosen.pop();
    }
    return false;
  };
  if (search(0)) return chosen;

  // No overlap-free layout: best effort, never outside the bounds.
  return points.slice(0, n).map((p, i) => {
    const all = candidates(i, p, sizes[i]);
    const fit = all.find((c) => rectInside(c, bounds));
    if (fit) return fit;
    const c = all[0];
    return {
      ...c,
      x: clampTo(c.x, bounds.x, bounds.x + bounds.width - c.width),
      y: clampTo(c.y, bounds.y, bounds.y + bounds.height - c.height),
    };
  });
}

// ---------- positionTooltip ----------

/** Minimum distance between the tooltip and the viewport edge (matches `100vw − 16px`). */
export const TOOLTIP_VIEWPORT_MARGIN = 8;
/** Distance between the anchor (marker button) and the tooltip. */
export const TOOLTIP_GAP = 8;
/** Max tooltip width: `min(22rem, 100vw − 16px)` (design, Req 19.17). */
export function tooltipMaxWidth(viewportWidth: number, remPx = 16): number {
  return Math.max(0, Math.min(22 * remPx, viewportWidth - 2 * TOOLTIP_VIEWPORT_MARGIN));
}

/**
 * Top-left viewport position for a tooltip of `size` anchored to `anchor` (viewport coordinates).
 * Prefers centered above the anchor, flips below when there is no room above, and finally clamps
 * into the viewport with an 8 px margin, so a tooltip no larger than `viewport − 16 px` in each
 * dimension always lies fully inside the viewport (Req 19.17, Property 14).
 */
export function positionTooltip(anchor: Rect, size: Size, viewport: Size): Point {
  const m = TOOLTIP_VIEWPORT_MARGIN;
  const above = anchor.y - TOOLTIP_GAP - size.height;
  const below = anchor.y + anchor.height + TOOLTIP_GAP;
  const fitsAbove = above >= m;
  const fitsBelow = below + size.height <= viewport.height - m;
  const y = fitsAbove ? above : fitsBelow ? below : above;
  const x = anchor.x + anchor.width / 2 - size.width / 2;
  return {
    x: clampTo(x, m, viewport.width - m - size.width),
    y: clampTo(y, m, viewport.height - m - size.height),
  };
}

// ---------- journeyTooltipReducer ----------

/**
 * `open`: the marker whose Journey_Tooltip is shown (at most one). `focused`: the marker holding
 * keyboard focus, tracked so Escape can close the tooltip without moving focus (Req 19.20).
 */
export interface TooltipState {
  open: number | null;
  focused: number | null;
}

export const INITIAL_TOOLTIP_STATE: TooltipState = { open: null, focused: null };

export type TooltipEvent =
  /** Fine pointer entered marker `index` (the component filters out touch/coarse pointers). */
  | { type: "pointerEnter"; index: number }
  /** Fine pointer left marker `index`. */
  | { type: "pointerLeave"; index: number }
  /** Touch tap on marker `index`: toggles that marker's tooltip (Req 19.2, 19.21). */
  | { type: "tap"; index: number }
  | { type: "focus"; index: number }
  | { type: "blur"; index: number }
  /** Enter or Space on the focused marker `index` (Req 19.19). */
  | { type: "activate"; index: number }
  | { type: "escape" }
  /** Tap or click outside every tooltip and marker. */
  | { type: "outside" };

const next = (s: TooltipState, open: number | null, focused: number | null = s.focused): TooltipState =>
  s.open === open && s.focused === focused ? s : { open, focused };

/**
 * Tooltip state machine (Req 19.1, 19.2, 19.17, 19.19–19.21). Opening any marker replaces the open
 * one, so at most one tooltip is open. Returns the same object when nothing changes.
 */
export function journeyTooltipReducer(s: TooltipState, e: TooltipEvent): TooltipState {
  switch (e.type) {
    case "pointerEnter":
    case "activate":
      return next(s, e.index);
    case "focus":
      return next(s, e.index, e.index);
    case "tap":
      return next(s, s.open === e.index ? null : e.index);
    case "pointerLeave":
      return next(s, s.open === e.index ? null : s.open);
    case "blur":
      return next(s, s.open === e.index ? null : s.open, s.focused === e.index ? null : s.focused);
    case "escape":
    case "outside":
      return next(s, null);
  }
}
