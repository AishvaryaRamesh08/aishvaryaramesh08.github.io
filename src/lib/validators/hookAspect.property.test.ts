// Feature: portfolio-website, Property 28: Hook aspect-ratio check —
// for any positive integer dimensions of hookBefore and hookAfter, the hookAspect validator errors
// exactly when wB × hA ≠ wA × hB, and the error names both entries. Uniformly scaled pairs never error.
// **Validates: Requirements 8.5**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkHookAspect, hookAspect, type Content, type Size } from "./index";

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** Independent oracle: compare ratios in lowest terms (no cross-multiplication). */
const sameRatio = (a: Size, b: Size): boolean => {
  const ga = gcd(a.width, a.height);
  const gb = gcd(b.width, b.height);
  return a.width / ga === b.width / gb && a.height / ga === b.height / gb;
};

/** Any positive-integer box, from tiny to near Number.MAX_SAFE_INTEGER (products overflow 2^53). */
const arbDim = fc.oneof(
  fc.integer({ min: 1, max: 4000 }),
  fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
);
const arbBox: fc.Arbitrary<Size> = fc.record({ width: arbDim, height: arbDim });

/** Two boxes sharing one base ratio, each scaled by its own integer factor. */
const arbScaledPair: fc.Arbitrary<[Size, Size]> = fc
  .tuple(
    fc.integer({ min: 1, max: 100_000 }),
    fc.integer({ min: 1, max: 100_000 }),
    fc.integer({ min: 1, max: 10_000 }),
    fc.integer({ min: 1, max: 10_000 }),
  )
  .map(([w, h, k1, k2]) => [
    { width: w * k1, height: h * k1 },
    { width: w * k2, height: h * k2 },
  ]);

/** Mix of matching and arbitrary pairs so both outcomes are well covered. */
const arbPair: fc.Arbitrary<[Size, Size]> = fc.oneof(arbScaledPair, fc.tuple(arbBox, arbBox));

/** Box with at least one non-positive-integer side. */
const arbBadDim = fc.oneof(
  fc.integer({ min: -10_000, max: 0 }),
  fc.double({ min: 0.01, max: 4000, noInteger: true, noNaN: true }),
  fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1),
);
const arbBadBox: fc.Arbitrary<Size> = fc.oneof(
  fc.record({ width: arbBadDim, height: arbDim }),
  fc.record({ width: arbDim, height: arbBadDim }),
  fc.record({ width: arbBadDim, height: arbBadDim }),
);

const fmt = (b: Size): string => `${b.width}×${b.height}`;

const asContent = (before: Size, after: Size) =>
  ({
    hookImages: {
      hookBefore: before,
      hookAfter: after,
    },
  }) as unknown as Pick<Content, "hookImages">;

describe("Property 28: Hook aspect-ratio check", () => {
  it("errors exactly when the ratios differ, naming both entries", () => {
    fc.assert(
      fc.property(arbPair, ([before, after]) => {
        const errors = checkHookAspect(before, after);
        if (sameRatio(before, after)) {
          expect(errors).toEqual([]);
        } else {
          expect(errors).toHaveLength(1);
          const [e] = errors;
          expect(e.file).toBe("hook.ts");
          expect(e.path).toBe("");
          expect(e.message).toBe(
            `hookBefore (${fmt(before)}) and hookAfter (${fmt(after)}) aspect ratios differ`,
          );
        }
        // The Content-level validator reports the same result.
        expect(hookAspect(asContent(before, after))).toEqual(errors);
      }),
    );
  });

  it("never errors for uniformly scaled pairs", () => {
    fc.assert(
      fc.property(arbScaledPair, ([before, after]) => {
        expect(checkHookAspect(before, after)).toEqual([]);
        expect(checkHookAspect(after, before)).toEqual([]);
      }),
    );
  });

  it("reports non-positive-integer boxes with their own error and skips the ratio check", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.tuple(arbBadBox, arbBox).map(([b, a]) => ({ before: b, after: a, bad: ["hookBefore"] })),
          fc.tuple(arbBox, arbBadBox).map(([b, a]) => ({ before: b, after: a, bad: ["hookAfter"] })),
          fc.tuple(arbBadBox, arbBadBox).map(([b, a]) => ({ before: b, after: a, bad: ["hookBefore", "hookAfter"] })),
        ),
        ({ before, after, bad }) => {
          const errors = checkHookAspect(before, after);
          expect(errors.map((e) => e.path)).toEqual(bad);
          for (const e of errors) {
            expect(e.file).toBe("hook.ts");
            expect(e.message).toMatch(/must be positive integers$/);
            expect(e.message).not.toMatch(/aspect ratios differ/);
          }
        },
      ),
    );
  });
});
