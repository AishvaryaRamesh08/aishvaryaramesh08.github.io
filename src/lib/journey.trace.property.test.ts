// Feature: portfolio-website, Property 11: Journey trace mapping —
// for any Journey_Stage array of length n ≥ 1, `buildJourneyTrace` returns exactly one scatter
// trace with `line.shape = "hv"` and n points, x values 1..n in order, strictly increasing y values,
// and per-point label, approxYear and detail texts equal to the corresponding stage fields.
// The last marker alone uses the "current" color with a ring; axes stay hidden over [0.5, n + 0.5]
// and the plot is static. `markerPositions` puts stage k at the center of the k-th equal column
// and row, ascending upward, inside the plot box.
// **Validates: Requirements 19.6, 19.7, 19.9**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { JourneyStage } from "../data/types";
import type { Theme } from "./theme";
import {
  JOURNEY_COLORS,
  JOURNEY_MARGIN,
  buildJourneyTrace,
  markerPositions,
  type Box,
  type Margin,
} from "./journey";

const themes: Theme[] = ["dark", "light"];

const arbText = fc.string({ minLength: 1, maxLength: 24 });
const arbStage: fc.Arbitrary<JourneyStage> = fc.record({
  label: arbText,
  approxYear: arbText,
  detail: fc.string({ minLength: 1, maxLength: 80 }),
});
const arbStages = fc.array(arbStage, { minLength: 1, maxLength: 8 });

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

describe("Property 11: Journey trace mapping", () => {
  it("maps stages to one hv step trace with matching texts, colors, hidden axes and a static plot", () => {
    fc.assert(
      fc.property(arbStages, fc.constantFrom(...themes), (stages, theme) => {
        const colors = JOURNEY_COLORS[theme];
        const n = stages.length;
        const { data, layout, config } = buildJourneyTrace(stages, colors);

        // Exactly one scatter trace, lines+markers, hv steps.
        expect(data).toHaveLength(1);
        const [t] = data;
        expect(t.type).toBe("scatter");
        expect(t.mode).toBe("lines+markers");
        expect(t.line.shape).toBe("hv");

        // n points at 1..n on both axes; y strictly increasing.
        expect(t.x).toEqual(range(n));
        expect(t.y).toEqual(range(n));
        for (let i = 1; i < n; i++) expect(t.y[i]).toBeGreaterThan(t.y[i - 1]);

        // Per-point texts equal the stage fields, in order.
        expect(t.text).toEqual(stages.map((s) => s.label));
        expect(t.customdata).toEqual(stages.map((s) => [s.label, s.approxYear, s.detail]));

        // Every marker is `marker` except the last, which is `current` with a visible ring.
        expect(t.marker.color).toHaveLength(n);
        expect(t.marker.line.color).toHaveLength(n);
        expect(t.marker.line.width).toHaveLength(n);
        for (let i = 0; i < n - 1; i++) {
          expect(t.marker.color[i]).toBe(colors.marker);
          expect(t.marker.line.width[i]).toBe(0);
        }
        expect(t.marker.color[n - 1]).toBe(colors.current);
        expect(t.marker.line.color[n - 1]).toBe(colors.currentRing);
        expect(t.marker.line.width[n - 1]).toBeGreaterThan(0);

        // No legend, invisible axes over the fixed range, static plot.
        expect(t.showlegend).toBe(false);
        expect(layout.showlegend).toBe(false);
        for (const ax of [layout.xaxis, layout.yaxis]) {
          expect(ax.visible).toBe(false);
          expect(ax.range).toEqual([0.5, n + 0.5]);
        }
        expect(config.staticPlot).toBe(true);
      }),
    );
  });

  it("defaults to the dark theme colors", () => {
    fc.assert(
      fc.property(arbStages, (stages) => {
        expect(buildJourneyTrace(stages)).toEqual(buildJourneyTrace(stages, JOURNEY_COLORS.dark));
      }),
    );
  });
});

// ---------- markerPositions ----------

const arbMargin: fc.Arbitrary<Margin> = fc.record({
  l: fc.integer({ min: 0, max: 48 }),
  r: fc.integer({ min: 0, max: 48 }),
  t: fc.integer({ min: 0, max: 48 }),
  b: fc.integer({ min: 0, max: 48 }),
});

/** A box with a non-empty plot area for the margin (CSS px, integers to keep float error tiny). */
const arbBoxAndMargin: fc.Arbitrary<{ box: Box; margin: Margin }> = fc
  .oneof(fc.constant(JOURNEY_MARGIN as Margin), arbMargin)
  .chain((margin) =>
    fc.record({
      margin: fc.constant(margin),
      box: fc.record({
        x: fc.integer({ min: -500, max: 500 }),
        y: fc.integer({ min: -500, max: 500 }),
        width: fc.integer({ min: margin.l + margin.r + 1, max: 2000 }),
        height: fc.integer({ min: margin.t + margin.b + 1, max: 2000 }),
      }),
    }),
  );

describe("Property 11: markerPositions match the trace layout", () => {
  it("places stage k at the center of the k-th equal column and row, ascending, inside the plot box", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), arbBoxAndMargin, (n, { box, margin }) => {
        const pts = markerPositions(n, box, margin);
        expect(pts).toHaveLength(n);

        const left = box.x + margin.l;
        const top = box.y + margin.t;
        const plotW = box.width - margin.l - margin.r;
        const plotH = box.height - margin.t - margin.b;
        const colW = plotW / n;
        const rowH = plotH / n;

        pts.forEach((p, i) => {
          // Center of the (i+1)-th column from the left and row from the bottom.
          expect(p.x).toBeCloseTo(left + (i + 0.5) * colW, 6);
          expect(p.y).toBeCloseTo(top + plotH - (i + 0.5) * rowH, 6);
          // Strictly inside the plot box.
          expect(p.x).toBeGreaterThan(left);
          expect(p.x).toBeLessThan(left + plotW);
          expect(p.y).toBeGreaterThan(top);
          expect(p.y).toBeLessThan(top + plotH);
        });

        for (let i = 1; i < n; i++) {
          // x increases, y decreases (CSS y grows downward, so steps ascend), equal spacing.
          expect(pts[i].x).toBeGreaterThan(pts[i - 1].x);
          expect(pts[i].y).toBeLessThan(pts[i - 1].y);
          expect(pts[i].x - pts[i - 1].x).toBeCloseTo(colW, 6);
          expect(pts[i - 1].y - pts[i].y).toBeCloseTo(rowH, 6);
        }
      }),
    );
  });

  it("returns no points for n ≤ 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: -5, max: 0 }), arbBoxAndMargin, (n, { box, margin }) => {
        expect(markerPositions(n, box, margin)).toEqual([]);
      }),
    );
  });
});
