// Feature: portfolio-website, Property 25: Tab keyboard navigation —
// for any tab count n ≥ 1 and current index i, nextTabIndex returns min(i+1, n−1) for ArrowRight,
// max(i−1, 0) for ArrowLeft, 0 for Home, n−1 for End, and i for any other key (no wrap-around).
// **Validates: Requirements 14.11**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nextTabIndex } from "./scroll";

const NAV_KEYS = ["ArrowRight", "ArrowLeft", "Home", "End"] as const;

/** Tab count n ≥ 1 and a valid current index i ∈ [0, n−1]. */
const arbTabState = fc
  .integer({ min: 1, max: 12 })
  .chain((n) => fc.tuple(fc.constant(n), fc.integer({ min: 0, max: n - 1 })));

/** Any key that is not one of the four navigation keys (letters, Tab, Enter, ArrowUp, …). */
const arbOtherKey = fc
  .oneof(
    fc.constantFrom("Tab", "Enter", " ", "ArrowUp", "ArrowDown", "Escape", "PageUp", "PageDown", "a", "home", "arrowright"),
    fc.string({ maxLength: 12 }),
  )
  .filter((key) => !(NAV_KEYS as readonly string[]).includes(key));

/** Key presses mixing navigation keys with unrelated keys. */
const arbKey = fc.oneof(fc.constantFrom(...NAV_KEYS), arbOtherKey);

/** Reference model from the spec. */
function expected(key: string, i: number, n: number): number {
  switch (key) {
    case "ArrowRight":
      return Math.min(i + 1, n - 1);
    case "ArrowLeft":
      return Math.max(i - 1, 0);
    case "Home":
      return 0;
    case "End":
      return n - 1;
    default:
      return i;
  }
}

describe("Property 25: Tab keyboard navigation", () => {
  it("each navigation key maps to its specified index without wrap-around", () => {
    fc.assert(
      fc.property(arbTabState, fc.constantFrom(...NAV_KEYS), ([n, i], key) => {
        expect(nextTabIndex(key, i, n)).toBe(expected(key, i, n));
      }),
    );
  });

  it("ArrowRight on the last tab and ArrowLeft on the first tab do not wrap", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), (n) => {
        expect(nextTabIndex("ArrowRight", n - 1, n)).toBe(n - 1);
        expect(nextTabIndex("ArrowLeft", 0, n)).toBe(0);
      }),
    );
  });

  it("any other key leaves the index unchanged", () => {
    fc.assert(
      fc.property(arbTabState, arbOtherKey, ([n, i], key) => {
        expect(nextTabIndex(key, i, n)).toBe(i);
      }),
    );
  });

  it("any sequence of key presses keeps the index in [0, n−1] and matches the model", () => {
    fc.assert(
      fc.property(arbTabState, fc.array(arbKey, { maxLength: 30 }), ([n, start], keys) => {
        let actual = start;
        let model = start;
        for (const key of keys) {
          actual = nextTabIndex(key, actual, n);
          model = expected(key, model, n);
          expect(Number.isInteger(actual)).toBe(true);
          expect(actual).toBeGreaterThanOrEqual(0);
          expect(actual).toBeLessThanOrEqual(n - 1);
          expect(actual).toBe(model);
        }
      }),
    );
  });
});
