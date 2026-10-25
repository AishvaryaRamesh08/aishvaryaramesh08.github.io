// Feature: portfolio-website, Property 26: Story row morph is a function of scroll position —
// for any row count n in 4..10 and progress p, rowsCleanedAtProgress(p, n) = floor(clamp(p, 0, 1) × n),
// so row k is cleaned exactly when p ≥ k/n. The value is monotonic in p and depends only on p,
// which makes the scroll direction irrelevant.
// **Validates: Requirements 10.2**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { rowsCleanedAtProgress } from "./scroll";

/** Story table row count (Req 10.1: 4 to 10 data rows). */
const arbRowCount = fc.integer({ min: 4, max: 10 });

/** Scroll progress, including out-of-range values a scrub callback may overshoot to. */
const arbProgress = fc.oneof(
  fc.double({ min: 0, max: 1, noNaN: true }),
  fc.double({ min: -2, max: 3, noNaN: true }),
  fc.constantFrom(0, 1, -0),
);

/** Row count plus a progress exactly on a row boundary k/n. */
const arbBoundary = arbRowCount.chain((n) =>
  fc.integer({ min: 0, max: n }).map((k) => ({ n, k, p: k / n })),
);

/**
 * Row count, row index k in 1..n and a progress kept at least 1e-9 away from k/n, so the
 * comparison against the boundary is well defined without depending on last-bit rounding.
 */
const arbAwayFromBoundary = arbRowCount.chain((n) =>
  fc
    .tuple(fc.integer({ min: 1, max: n }), fc.double({ min: 0, max: 1, noNaN: true }))
    .filter(([k, p]) => Math.abs(p - k / n) > 1e-9)
    .map(([k, p]) => ({ n, k, p })),
);

/** Replays a scroll path and returns the displayed row count after its last position. */
function rowsAfterPath(path: readonly number[], n: number): number {
  let rows = rowsCleanedAtProgress(0, n);
  for (const p of path) rows = rowsCleanedAtProgress(p, n);
  return rows;
}

const clamp01 = (p: number) => Math.min(Math.max(p, 0), 1);

describe("Property 26: Story row morph is a function of scroll position", () => {
  it("equals floor(clamp(p, 0, 1) × n) and stays an integer in [0, n]", () => {
    fc.assert(
      fc.property(arbProgress, arbRowCount, (p, n) => {
        const rows = rowsCleanedAtProgress(p, n);
        expect(rows).toBe(Math.floor(clamp01(p) * n));
        expect(Number.isInteger(rows)).toBe(true);
        expect(rows).toBeGreaterThanOrEqual(0);
        expect(rows).toBeLessThanOrEqual(n);
      }),
    );
  });

  it("cleans row k at exactly p = k/n", () => {
    fc.assert(
      fc.property(arbBoundary, ({ n, k, p }) => {
        expect(rowsCleanedAtProgress(p, n)).toBe(k);
      }),
    );
  });

  it("shows row k cleaned iff p ≥ k/n (away from the boundary)", () => {
    fc.assert(
      fc.property(arbAwayFromBoundary, ({ n, k, p }) => {
        expect(rowsCleanedAtProgress(p, n) >= k).toBe(p >= k / n);
      }),
    );
  });

  it("is monotonic non-decreasing in p", () => {
    fc.assert(
      fc.property(arbProgress, arbProgress, arbRowCount, (a, b, n) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(rowsCleanedAtProgress(lo, n)).toBeLessThanOrEqual(rowsCleanedAtProgress(hi, n));
      }),
    );
  });

  it("depends only on the final position, whatever scroll path (down or up) led there", () => {
    fc.assert(
      fc.property(
        fc.array(arbProgress, { maxLength: 20 }),
        fc.array(arbProgress, { maxLength: 20 }),
        arbProgress,
        arbRowCount,
        (pathA, pathB, end, n) => {
          const direct = rowsCleanedAtProgress(end, n);
          // Approaching from below (scrolling down) and from above (scrolling up).
          const fromBelow = rowsAfterPath([...pathA, clamp01(end) / 2, end], n);
          const fromAbove = rowsAfterPath([...pathB, (clamp01(end) + 1) / 2, end], n);
          expect(rowsAfterPath([...pathA, end], n)).toBe(direct);
          expect(rowsAfterPath([...pathB, end], n)).toBe(direct);
          expect(fromBelow).toBe(direct);
          expect(fromAbove).toBe(direct);
        },
      ),
    );
  });
});
