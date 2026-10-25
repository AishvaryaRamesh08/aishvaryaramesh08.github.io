// Feature: portfolio-website, Property 36: Depth-layer parallax —
// for any scroll offset y > 0 and valid layer config (2–3 layers, distinct speeds in (0, 1)),
// each layer's displacement magnitude is strictly less than y, and no two layers have the same
// displacement.
// **Validates: Requirements 6.3**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { layerOffsets } from "./scene";

/**
 * Valid depth-layer config: 2–3 distinct speeds in (0, 1). Speeds are whole thousandths
 * (0.001 … 0.999), matching how configs are authored (e.g. 0.10 / 0.20 / 0.35) and keeping
 * distinct speeds far enough apart that floating-point products stay distinct.
 */
const arbLayers = fc
  .uniqueArray(fc.integer({ min: 1, max: 999 }), { minLength: 2, maxLength: 3 })
  .map((ks) => ks.map((k) => ({ speed: k / 1000 })));

/** Positive scroll offset in px, including sub-pixel values and very long pages. */
const arbScrollY = fc.double({ min: 0.01, max: 1e7, noNaN: true, noDefaultInfinity: true });

/** Scroll values that must produce no displacement: zero, negative (overscroll) and non-finite. */
const arbNoScroll = fc.oneof(
  fc.constant(0),
  fc.constant(-0),
  fc.double({ min: -1e7, max: -Number.MIN_VALUE, noNaN: true }),
  fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
);

describe("Property 36: Depth-layer parallax", () => {
  it("every layer moves up, slower than the foreground, and at a distinct rate", () => {
    fc.assert(
      fc.property(arbScrollY, arbLayers, (scrollY, layers) => {
        const offsets = layerOffsets(scrollY, layers);
        expect(offsets).toHaveLength(layers.length);
        offsets.forEach((offset, i) => {
          expect(offset).toBe(-scrollY * layers[i].speed);
          expect(offset).toBeLessThan(0);
          expect(Math.abs(offset)).toBeLessThan(scrollY);
        });
        expect(new Set(offsets).size).toBe(offsets.length);
      }),
    );
  });

  it("zero, negative and non-finite scroll give no displacement", () => {
    fc.assert(
      fc.property(arbNoScroll, arbLayers, (scrollY, layers) => {
        const offsets = layerOffsets(scrollY, layers);
        expect(offsets).toHaveLength(layers.length);
        offsets.forEach((offset) => expect(offset === 0).toBe(true));
      }),
    );
  });

  it("the default 0.10 / 0.20 / 0.35 layers stay below scroll speed and distinct", () => {
    const offsets = layerOffsets(1000, [{ speed: 0.1 }, { speed: 0.2 }, { speed: 0.35 }]);
    expect(offsets).toEqual([-100, -200, -350]);
  });
});
