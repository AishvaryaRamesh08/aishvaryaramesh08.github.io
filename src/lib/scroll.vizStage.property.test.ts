// Feature: portfolio-website, Property 24: Viz stage mapping and tab target round trip —
// for any stage count n and progress p in [0, 1], stageAtProgress(p, n) returns k − 1 exactly when
// (k−1)/n ≤ p < k/n (the last stage for p ≥ (n−1)/n) and is non-decreasing in p; for any k,
// stageAtProgress(progressForStage(k, n), n) = k − 1.
// **Validates: Requirements 14.5, 14.7**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { progressForStage, stageAtProgress, STAGE_EPSILON } from "./scroll";

/** Stage counts: the Viz_Showcase uses 3 or 4, weighted heavily, plus a wider sane range. */
const arbStageCount = fc.oneof(
  { weight: 3, arbitrary: fc.constantFrom(3, 4) },
  { weight: 1, arbitrary: fc.integer({ min: 1, max: 12 }) },
);

/** Pinned-range progress in [0, 1], including the exact endpoints. */
const arbProgress = fc.oneof(
  fc.double({ min: 0, max: 1, noNaN: true }),
  fc.constantFrom(0, 1),
);

/** A stage count together with a progress value sitting exactly on one of its k/n boundaries. */
const arbBoundary = arbStageCount.chain((n) =>
  fc.integer({ min: 0, max: n - 1 }).map((j) => ({ n, j, p: j / n })),
);

/** A stage count together with a valid 1-based stage index k ∈ [1, n]. */
const arbStage = arbStageCount.chain((n) => fc.integer({ min: 1, max: n }).map((k) => ({ n, k })));

describe("Property 24: Viz stage mapping and tab target round trip", () => {
  it("returns k − 1 exactly when (k−1)/n ≤ p < k/n, and the last stage for p ≥ (n−1)/n", () => {
    fc.assert(
      fc.property(arbStageCount, arbProgress, (n, p) => {
        const stage = stageAtProgress(p, n);
        const k = stage + 1;
        expect(Number.isInteger(stage)).toBe(true);
        expect(stage).toBeGreaterThanOrEqual(0);
        expect(stage).toBeLessThanOrEqual(n - 1);
        expect((k - 1) / n).toBeLessThanOrEqual(p);
        if (k < n) expect(p).toBeLessThan(k / n);
        else expect(p).toBeGreaterThanOrEqual((n - 1) / n);
      }),
    );
  });

  it("makes stage j current exactly at progress j/n", () => {
    fc.assert(
      fc.property(arbBoundary, ({ n, j, p }) => {
        expect(stageAtProgress(p, n)).toBe(j);
      }),
    );
  });

  it("is monotonically non-decreasing in p (same stage regardless of scroll direction)", () => {
    fc.assert(
      fc.property(arbStageCount, arbProgress, arbProgress, (n, a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(stageAtProgress(lo, n)).toBeLessThanOrEqual(stageAtProgress(hi, n));
      }),
    );
  });

  it("clamps progress outside [0, 1] to the first or last stage", () => {
    fc.assert(
      fc.property(arbStageCount, fc.double({ min: 0, max: 1e6, noNaN: true, minExcluded: true }), (n, d) => {
        expect(stageAtProgress(-d, n)).toBe(0);
        expect(stageAtProgress(1 + d, n)).toBe(n - 1);
      }),
    );
  });

  it("round trips: stageAtProgress(progressForStage(k, n), n) = k − 1", () => {
    fc.assert(
      fc.property(arbStage, ({ n, k }) => {
        const target = progressForStage(k, n);
        expect(target).toBeGreaterThanOrEqual(0);
        expect(target).toBeLessThanOrEqual(1);
        expect(target).toBeCloseTo(Math.min((k - 1) / n + STAGE_EPSILON, 1), 12);
        expect(stageAtProgress(target, n)).toBe(k - 1);
      }),
    );
  });

  it("clamps out-of-range k to [1, n] before computing the tab target", () => {
    fc.assert(
      fc.property(arbStageCount, fc.integer({ min: -1000, max: 1000 }), (n, k) => {
        const clampedK = Math.min(Math.max(k, 1), n);
        expect(progressForStage(k, n)).toBe(progressForStage(clampedK, n));
        expect(stageAtProgress(progressForStage(k, n), n)).toBe(clampedK - 1);
      }),
    );
  });
});
