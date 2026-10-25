// Feature: portfolio-website, Property 41: Count-up ends on the exact final text —
// for any final text of the form <prefix><non-negative integer><suffix> and progress in [0, 1],
// countUpText(1, f) === f, countUpText(0, f) is the prefix + "0" + suffix, and the numeric part is
// non-decreasing in progress (and stays within [0, N]).
// **Validates: Requirements 9.6**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { countUpText } from "./motion";

/** Prefix with no ASCII digits, so the first digit run is the generated number. */
const arbPrefix = fc.stringMatching(/^[^0-9]{0,6}$/);

/**
 * Suffix that doesn't start with an ASCII digit (otherwise it would extend the number) but may
 * contain later digits, e.g. "+", " yrs", "/10" (only the first digit run counts up).
 */
const arbSuffix = fc
  .tuple(fc.stringMatching(/^[^0-9]$/), fc.string({ maxLength: 7 }))
  .map(([head, rest]) => `${head}${rest}`);
const arbOptSuffix = fc.oneof(fc.constant(""), arbSuffix);

/** Safe non-negative integer, sometimes with leading zeros (e.g. "007"). */
const arbDigits = fc
  .tuple(fc.integer({ min: 0, max: 2 }), fc.maxSafeNat())
  .map(([zeros, n]) => `${"0".repeat(zeros)}${n}`);

const arbCountText = fc
  .tuple(arbPrefix, arbDigits, arbOptSuffix)
  .map(([prefix, digits, suffix]) => ({ prefix, digits, suffix, text: `${prefix}${digits}${suffix}`, n: Number(digits) }));

/** Progress strictly below 1 (the counting range). */
const arbProgress = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });

/** Splits countUpText output back into its numeric part, checking prefix and suffix are intact. */
function numericPart(out: string, prefix: string, suffix: string): string {
  expect(out.startsWith(prefix)).toBe(true);
  expect(out.endsWith(suffix)).toBe(true);
  return out.slice(prefix.length, out.length - suffix.length);
}

describe("Property 41: Count-up ends on the exact final text", () => {
  it("returns the exact final text at progress 1 and above", () => {
    fc.assert(
      fc.property(arbCountText, fc.double({ min: 1, noNaN: true }), ({ text }, p) => {
        expect(countUpText(1, text)).toBe(text);
        expect(countUpText(p, text)).toBe(text);
      }),
    );
  });

  it("starts at prefix + 0 + suffix at progress 0 and for NaN progress", () => {
    fc.assert(
      fc.property(arbCountText, ({ prefix, suffix, text }) => {
        expect(countUpText(0, text)).toBe(`${prefix}0${suffix}`);
        expect(countUpText(Number.NaN, text)).toBe(`${prefix}0${suffix}`);
      }),
    );
  });

  it("keeps prefix and suffix and a numeric part in [0, N] at every progress", () => {
    fc.assert(
      fc.property(arbCountText, arbProgress, ({ prefix, suffix, text, n }, p) => {
        const part = numericPart(countUpText(p, text), prefix, suffix);
        expect(part).toMatch(/^\d+$/);
        const value = Number(part);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(n);
        expect(value).toBe(Math.floor(p * n));
      }),
    );
  });

  it("numeric part is non-decreasing in progress, up to the final value", () => {
    fc.assert(
      fc.property(arbCountText, arbProgress, arbProgress, ({ prefix, suffix, text, n }, a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const vLo = Number(numericPart(countUpText(lo, text), prefix, suffix));
        const vHi = Number(numericPart(countUpText(hi, text), prefix, suffix));
        const vEnd = Number(numericPart(countUpText(1, text), prefix, suffix));
        expect(vLo).toBeLessThanOrEqual(vHi);
        expect(vHi).toBeLessThanOrEqual(vEnd);
        expect(vEnd).toBe(n);
      }),
    );
  });

  it("returns text without ASCII digits unchanged at every progress", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[^0-9]{0,12}$/), fc.double({ noNaN: false }), (text, p) => {
        expect(countUpText(p, text)).toBe(text);
      }),
    );
  });

  it("returns text with an unsafe integer unchanged at every progress", () => {
    fc.assert(
      fc.property(
        arbPrefix,
        fc.bigInt({ min: BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1), max: BigInt("1" + "0".repeat(30)) }),
        arbOptSuffix,
        arbProgress,
        (prefix, big, suffix, p) => {
          const text = `${prefix}${big.toString()}${suffix}`;
          expect(countUpText(p, text)).toBe(text);
        },
      ),
    );
  });
});
