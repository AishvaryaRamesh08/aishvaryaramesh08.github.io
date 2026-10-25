// Feature: portfolio-website, Property 23: Scroll progress —
// for any docHeight > viewportHeight > 0 and any scrollY, scrollProgress returns
// clamp(scrollY / (docHeight − viewportHeight), 0, 1): 0 at the top, 1 at the bottom, and
// monotonically non-decreasing in scrollY. A page that cannot scroll, or NaN input, reports 0.
// **Validates: Requirements 7.5**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { scrollProgress } from "./scroll";

/** Viewport height in CSS px (positive). */
const arbViewH = fc.double({ min: 1, max: 10_000, noNaN: true, noDefaultInfinity: true });

/** Scrollable extent docH − viewH in CSS px (strictly positive). */
const arbScrollable = fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

/** Any scroll offset, including overscroll above the top and past the bottom. */
const arbScrollY = fc.double({ min: -2_000_000, max: 2_000_000, noNaN: true, noDefaultInfinity: true });

/** A scrollable page: docH > viewH > 0. */
const arbPage = fc.tuple(arbViewH, arbScrollable).map(([viewH, scrollable]) => ({
  viewH,
  docH: viewH + scrollable,
}));

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

describe("Property 23: Scroll progress", () => {
  it("equals clamp(scrollY / (docH − viewH), 0, 1) and stays in [0, 1]", () => {
    fc.assert(
      fc.property(arbPage, arbScrollY, ({ docH, viewH }, scrollY) => {
        fc.pre(docH > viewH);
        const result = scrollProgress(scrollY, docH, viewH);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
        expect(result).toBe(clamp(scrollY / (docH - viewH), 0, 1) || 0);
      }),
    );
  });

  it("is 0 at the top and 1 at the bottom", () => {
    fc.assert(
      fc.property(arbPage, ({ docH, viewH }) => {
        fc.pre(docH > viewH);
        expect(scrollProgress(0, docH, viewH)).toBe(0);
        expect(scrollProgress(docH - viewH, docH, viewH)).toBe(1);
      }),
    );
  });

  it("is monotonically non-decreasing in scrollY", () => {
    fc.assert(
      fc.property(arbPage, arbScrollY, arbScrollY, ({ docH, viewH }, a, b) => {
        fc.pre(docH > viewH);
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(scrollProgress(lo, docH, viewH)).toBeLessThanOrEqual(scrollProgress(hi, docH, viewH));
      }),
    );
  });

  it("returns 0 when the page cannot scroll (docH ≤ viewH)", () => {
    fc.assert(
      fc.property(
        arbViewH,
        fc.double({ min: 0, max: 1, noNaN: true }),
        arbScrollY,
        (viewH, ratio, scrollY) => {
          const docH = viewH * ratio;
          expect(scrollProgress(scrollY, docH, viewH)).toBe(0);
        },
      ),
    );
  });

  it("returns 0 when any input is NaN", () => {
    fc.assert(
      fc.property(
        arbPage,
        arbScrollY,
        fc.constantFrom(0, 1, 2),
        ({ docH, viewH }, scrollY, nanIndex) => {
          const args: [number, number, number] = [scrollY, docH, viewH];
          args[nanIndex] = Number.NaN;
          expect(scrollProgress(...args)).toBe(0);
        },
      ),
    );
  });
});
