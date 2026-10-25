// Feature: portfolio-website, Property 40: Typewriter frames —
// for any elapsed time and valid timing (hold ≥ 2000 ms), typewriterFrame returns text that is a
// prefix of lines[lineIndex], the full line stays shown for at least the hold duration, and
// lineIndex advances in the cyclic order 0 → 1 → … → n−1 → 0.
// **Validates: Requirements 9.2**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_TYPE_TIMING, type TypeTiming, typewriterFrame } from "./motion";

/** One code point: astral characters are over-represented so surrogate pairs are always exercised. */
const arbCodePoint = fc.oneof(
  fc.constantFrom("😀", "🚀", "𝔸", "𐍈", "🧪"),
  fc.string({ unit: "binary", minLength: 1, maxLength: 1 }),
);

/** A typewriter line, possibly empty, made of whole code points. */
const arbLine = fc.string({ unit: arbCodePoint, maxLength: 24 });

const arbLines = fc.array(arbLine, { minLength: 1, maxLength: 5 });

/** Valid timing per Req 9.2 (hold ≥ 2 s); integer speeds keep phase boundaries exact. */
const arbTiming: fc.Arbitrary<TypeTiming> = fc.oneof(
  fc.constant({ ...DEFAULT_TYPE_TIMING }),
  fc.record({
    typeMs: fc.integer({ min: 1, max: 120 }),
    holdMs: fc.integer({ min: 2000, max: 5000 }),
    deleteMs: fc.integer({ min: 1, max: 120 }),
  }),
);

const codePoints = (s: string): string[] => Array.from(s);

/** Independent model of the schedule: per-line start offset, typing end and hold end. */
function schedule(lines: readonly string[], t: TypeTiming) {
  let start = 0;
  const rows = lines.map((line) => {
    const n = codePoints(line).length;
    const row = { start, n, typeEnd: start + n * t.typeMs, holdEnd: start + n * t.typeMs + t.holdMs };
    start += n * t.typeMs + t.holdMs + n * t.deleteMs;
    return row;
  });
  return { rows, cycle: start };
}

function expectCodePointPrefix(text: string, line: string): void {
  const textCps = codePoints(text);
  expect(textCps.length).toBeLessThanOrEqual(codePoints(line).length);
  expect(textCps).toEqual(codePoints(line).slice(0, textCps.length));
}

/** Picks a line index together with the inputs so index-based properties stay in range. */
const arbCase = fc
  .tuple(arbLines, arbTiming)
  .chain(([lines, t]) => fc.tuple(fc.constant(lines), fc.constant(t), fc.nat({ max: lines.length - 1 })));

describe("Property 40: Typewriter frames", () => {
  it("text is always a code-point prefix of lines[lineIndex], for any elapsed value", () => {
    fc.assert(
      fc.property(arbLines, arbTiming, fc.double(), (lines, t, elapsed) => {
        const frame = typewriterFrame(elapsed, lines, t);
        expect(Number.isInteger(frame.lineIndex)).toBe(true);
        expect(frame.lineIndex).toBeGreaterThanOrEqual(0);
        expect(frame.lineIndex).toBeLessThan(lines.length);
        expectCodePointPrefix(frame.text, lines[frame.lineIndex] ?? "");
      }),
    );
  });

  it("shows the full line throughout a hold window of at least holdMs", () => {
    fc.assert(
      fc.property(arbCase, fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }), ([lines, t, i], f) => {
        const row = schedule(lines, t).rows[i]!;
        const elapsed = row.typeEnd + Math.floor(f * t.holdMs);
        expect(typewriterFrame(elapsed, lines, t)).toEqual({ lineIndex: i, text: lines[i] });
        // Both ends of the hold window show the full line.
        expect(typewriterFrame(row.typeEnd, lines, t)).toEqual({ lineIndex: i, text: lines[i] });
        expect(typewriterFrame(row.holdEnd - 1, lines, t)).toEqual({ lineIndex: i, text: lines[i] });
      }),
    );
  });

  it("is periodic: frame(e) equals frame(e + k·cycle)", () => {
    fc.assert(
      fc.property(arbLines, arbTiming, fc.nat({ max: 10_000_000 }), fc.integer({ min: 1, max: 5 }), (lines, t, e, k) => {
        const { cycle } = schedule(lines, t);
        expect(typewriterFrame(e + k * cycle, lines, t)).toEqual(typewriterFrame(e, lines, t));
      }),
    );
  });

  it("grows monotonically while typing and reaches the full line when typing ends", () => {
    fc.assert(
      fc.property(arbCase, fc.nat(), fc.nat(), ([lines, t, i], a, b) => {
        const row = schedule(lines, t).rows[i]!;
        const typingMs = row.typeEnd - row.start;
        if (typingMs > 0) {
          const [lo, hi] = [a % typingMs, b % typingMs].sort((x, y) => x - y) as [number, number];
          const early = typewriterFrame(row.start + lo, lines, t);
          const late = typewriterFrame(row.start + hi, lines, t);
          expect(early.lineIndex).toBe(i);
          expect(late.lineIndex).toBe(i);
          expect(codePoints(early.text).length).toBeLessThanOrEqual(codePoints(late.text).length);
          // Typing starts from an empty line.
          expect(typewriterFrame(row.start, lines, t).text).toBe("");
        }
        expect(typewriterFrame(row.typeEnd, lines, t).text).toBe(lines[i]);
      }),
    );
  });

  it("advances lineIndex in order 0 → 1 → … → n−1 and wraps back to 0", () => {
    fc.assert(
      fc.property(
        arbLines,
        arbTiming,
        fc.array(fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }), { maxLength: 40 }),
        (lines, t, fractions) => {
          const { rows, cycle } = schedule(lines, t);
          // Each line begins exactly at its start offset, in order.
          rows.forEach((row, i) => expect(typewriterFrame(row.start, lines, t).lineIndex).toBe(i));
          // Within one cycle the index never goes backwards.
          const times = fractions.map((f) => Math.floor(f * cycle)).sort((x, y) => x - y);
          const indices = times.map((e) => typewriterFrame(e, lines, t).lineIndex);
          indices.forEach((idx, j) => {
            if (j > 0) expect(idx).toBeGreaterThanOrEqual(indices[j - 1]!);
          });
          // The last line hands off to the first.
          expect(typewriterFrame(cycle - 1, lines, t).lineIndex).toBe(lines.length - 1);
          expect(typewriterFrame(cycle, lines, t)).toEqual({ lineIndex: 0, text: "" });
        },
      ),
    );
  });

  it("treats negative and non-finite elapsed as 0, and empty lines as an empty frame", () => {
    fc.assert(
      fc.property(
        arbLines,
        arbTiming,
        fc.oneof(fc.double({ max: -Number.MIN_VALUE, noNaN: true }), fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY)),
        (lines, t, elapsed) => {
          expect(typewriterFrame(elapsed, lines, t)).toEqual(typewriterFrame(0, lines, t));
          expect(typewriterFrame(elapsed, [], t)).toEqual({ lineIndex: 0, text: "" });
        },
      ),
    );
  });
});
