import { describe, expect, it } from "vitest";
import { journey } from "../data/journey";
import {
  INITIAL_TOOLTIP_STATE,
  JOURNEY_COLORS,
  JOURNEY_LABEL_MAX,
  JOURNEY_MARGIN,
  buildJourneyTrace,
  journeyChartHeight,
  journeyTooltipReducer,
  layoutJourneyLabels,
  markerBox,
  markerPositions,
  positionTooltip,
  rectInside,
  rectsOverlap,
} from "./journey";

describe("buildJourneyTrace", () => {
  it("maps the four stages to one hv step trace with a maroon current marker", () => {
    const { data, layout, config } = buildJourneyTrace(journey);
    expect(data).toHaveLength(1);
    const [trace] = data;
    expect(trace).toMatchObject({ type: "scatter", mode: "lines+markers", line: { shape: "hv" } });
    expect(trace.x).toEqual([1, 2, 3, 4]);
    expect(trace.y).toEqual([1, 2, 3, 4]);
    expect(trace.text).toEqual(["Undergraduate", "Kimberly-Clark", "Wells Fargo", "Texas A&M"]);
    expect(trace.customdata[3]).toEqual([journey[3].label, journey[3].approxYear, journey[3].detail]);

    const { dark } = JOURNEY_COLORS;
    expect(trace.marker.color).toEqual([dark.marker, dark.marker, dark.marker, dark.current]);
    expect(trace.marker.line.color[3]).toBe(dark.currentRing);
    expect(trace.marker.line.width[3]).toBeGreaterThan(0);
    expect(trace.marker.size).toBeGreaterThanOrEqual(16);

    expect(layout.showlegend).toBe(false);
    expect(layout.xaxis).toMatchObject({ visible: false, range: [0.5, 4.5] });
    expect(layout.yaxis).toMatchObject({ visible: false, range: [0.5, 4.5] });
    expect(layout.paper_bgcolor).toBe(layout.plot_bgcolor);
    expect(config.staticPlot).toBe(true);
  });
});

describe("markerPositions", () => {
  it("places markers at the centers of equal columns, ascending upward", () => {
    const box = { x: 0, y: 0, width: 432, height: 448 };
    const points = markerPositions(4, box, { l: 16, r: 16, t: 32, b: 16 });
    // plot 400 × 400 → columns/rows of 100 px.
    expect(points).toEqual([
      { x: 66, y: 382 },
      { x: 166, y: 282 },
      { x: 266, y: 182 },
      { x: 366, y: 82 },
    ]);
    expect(markerPositions(0, box)).toEqual([]);
  });
});

describe("layoutJourneyLabels", () => {
  it.each([320, 768, 1440])("places the four labels without overlap at %i px", (width) => {
    const bounds = { x: 0, y: 0, width, height: journeyChartHeight(width) };
    const points = markerPositions(4, bounds, JOURNEY_MARGIN);
    const sizes = journey.map(() => ({ ...JOURNEY_LABEL_MAX }));
    const labels = layoutJourneyLabels(points, sizes, bounds);

    expect(labels.map((l) => l.index)).toEqual([0, 1, 2, 3]);
    for (const label of labels) {
      expect(rectInside(label, bounds)).toBe(true);
      for (const p of points) expect(rectsOverlap(label, markerBox(p))).toBe(false);
      for (const other of labels) if (other !== label) expect(rectsOverlap(label, other)).toBe(false);
    }
  });

  it("prefers a centered label above the marker when there is room", () => {
    const bounds = { x: 0, y: 0, width: 1200, height: journeyChartHeight(1200) };
    const [label] = layoutJourneyLabels(markerPositions(1, bounds), [{ width: 100, height: 20 }], bounds);
    expect(label).toMatchObject({ side: "above", anchor: "center" });
  });
});

describe("positionTooltip", () => {
  const viewport = { width: 320, height: 640 };

  it("centers the tooltip above the anchor when it fits", () => {
    const anchor = { x: 138, y: 400, width: 44, height: 44 };
    expect(positionTooltip(anchor, { width: 200, height: 120 }, viewport)).toEqual({ x: 60, y: 272 });
  });

  it("flips below and clamps horizontally near the top-left corner", () => {
    const anchor = { x: 0, y: 10, width: 44, height: 44 };
    expect(positionTooltip(anchor, { width: 304, height: 120 }, viewport)).toEqual({ x: 8, y: 62 });
  });
});

describe("journeyTooltipReducer", () => {
  it("keeps one tooltip open and toggles on tap", () => {
    let s = journeyTooltipReducer(INITIAL_TOOLTIP_STATE, { type: "tap", index: 1 });
    expect(s.open).toBe(1);
    s = journeyTooltipReducer(s, { type: "tap", index: 2 });
    expect(s.open).toBe(2);
    s = journeyTooltipReducer(s, { type: "tap", index: 2 });
    expect(s.open).toBeNull();
  });

  it("closes on Escape without moving focus, and on blur or outside", () => {
    let s = journeyTooltipReducer(INITIAL_TOOLTIP_STATE, { type: "focus", index: 0 });
    expect(s).toEqual({ open: 0, focused: 0 });
    s = journeyTooltipReducer(s, { type: "escape" });
    expect(s).toEqual({ open: null, focused: 0 });
    s = journeyTooltipReducer(s, { type: "activate", index: 0 });
    expect(s.open).toBe(0);
    expect(journeyTooltipReducer(s, { type: "blur", index: 0 })).toEqual({ open: null, focused: null });
    expect(journeyTooltipReducer(s, { type: "outside" }).open).toBeNull();
  });

  it("closes on pointerLeave only for the open marker", () => {
    const s = journeyTooltipReducer(INITIAL_TOOLTIP_STATE, { type: "pointerEnter", index: 3 });
    expect(journeyTooltipReducer(s, { type: "pointerLeave", index: 1 })).toBe(s);
    expect(journeyTooltipReducer(s, { type: "pointerLeave", index: 3 }).open).toBeNull();
  });
});
