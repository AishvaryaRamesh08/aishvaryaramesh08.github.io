// Feature: portfolio-website, Property 15: Journey labels do not overlap —
// for any n in 1..8, container width in 320..1920 px (height journeyChartHeight(width)) and label
// sizes up to JOURNEY_LABEL_MAX, layoutJourneyLabels returns label boxes that lie fully inside the
// container, overlap no other label box and overlap no marker box.
// **Validates: Requirements 19.11**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  JOURNEY_LABEL_MAX,
  journeyChartHeight,
  layoutJourneyLabels,
  markerBox,
  markerPositions,
  rectInside,
  rectsOverlap,
  type Box,
  type Size,
} from "./journey";

/** Container box: width 320..1920, height from the chart rule, optional non-zero page offset. */
const arbBounds: fc.Arbitrary<Box> = fc
  .tuple(
    fc.oneof(fc.constantFrom(320, 1920), fc.double({ min: 320, max: 1920, noNaN: true })),
    fc.oneof(fc.constant(0), fc.integer({ min: -2000, max: 2000 }), fc.double({ min: -2000, max: 2000, noNaN: true })),
    fc.oneof(fc.constant(0), fc.integer({ min: -2000, max: 2000 }), fc.double({ min: -2000, max: 2000, noNaN: true })),
  )
  .map(([width, x, y]) => ({ x, y, width, height: journeyChartHeight(width) }));

/** A label size no larger than JOURNEY_LABEL_MAX, biased towards the maximum. */
const arbSize: fc.Arbitrary<Size> = fc.oneof(
  fc.constant({ ...JOURNEY_LABEL_MAX }),
  fc.record({
    width: fc.double({ min: 1, max: JOURNEY_LABEL_MAX.width, noNaN: true }),
    height: fc.double({ min: 1, max: JOURNEY_LABEL_MAX.height, noNaN: true }),
  }),
);

/** n in 1..8 with one size per stage. */
const arbSizes = fc
  .integer({ min: 1, max: 8 })
  .chain((n) => fc.array(arbSize, { minLength: n, maxLength: n }));

describe("Property 15: Journey labels do not overlap", () => {
  it("places every label inside the container, clear of other labels and every marker box", () => {
    fc.assert(
      fc.property(arbBounds, arbSizes, (bounds, sizes) => {
        const n = sizes.length;
        const points = markerPositions(n, bounds);
        const labels = layoutJourneyLabels(points, sizes, bounds);
        const markers = points.map((p) => markerBox(p));

        expect(labels).toHaveLength(n);
        labels.forEach((label, i) => {
          expect(label.index).toBe(i);
          expect(label.width).toBe(sizes[i].width);
          expect(label.height).toBe(sizes[i].height);
          expect(rectInside(label, bounds)).toBe(true);
          for (const m of markers) expect(rectsOverlap(label, m)).toBe(false);
          for (let j = i + 1; j < n; j++) expect(rectsOverlap(label, labels[j])).toBe(false);
        });
      }),
    );
  });
});
