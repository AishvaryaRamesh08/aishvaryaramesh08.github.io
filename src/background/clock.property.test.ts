// Feature: portfolio-website, Property 39: Visible-only animation clock —
// for any sequence of (timestamp, visible) frames with non-decreasing timestamps, advanceClock
// never advances during hidden frames, and advances by at most maxDt on any single frame,
// including the first frame after becoming visible again (no catch-up of missed time).
// **Validates: Requirements 6.10**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { advanceClock, createClock, DEFAULT_MAX_DT, type Clock } from "./clock";

interface Frame {
  now: number;
  visible: boolean;
}

/** Gap between consecutive rAF timestamps in ms: mostly frame-sized, sometimes a long hidden-tab pause. */
const arbGap = fc.oneof(
  fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  fc.double({ min: 0, max: 600_000, noNaN: true, noDefaultInfinity: true }),
);

/** A frame sequence with non-decreasing timestamps starting at an arbitrary rAF time. */
const arbFrames: fc.Arbitrary<Frame[]> = fc
  .tuple(
    fc.double({ min: 0, max: 1e7, noNaN: true, noDefaultInfinity: true }),
    fc.array(fc.tuple(arbGap, fc.boolean()), { maxLength: 60 }),
  )
  .map(([start, steps]) => {
    let now = start;
    return steps.map(([gap, visible]) => {
      now += gap;
      return { now, visible };
    });
  });

/** Per-frame cap: the default or any positive cap. */
const arbMaxDt = fc.oneof(
  fc.constant(DEFAULT_MAX_DT),
  fc.double({ min: 1, max: 1000, noNaN: true, noDefaultInfinity: true }),
);

/** Starting accumulated time (createClock input). */
const arbStartElapsed = fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true });

/** Rounding slack for `(a + b) − a` at magnitude `x`. */
const ulpTol = (x: number) => Number.EPSILON * 4 * Math.max(1, Math.abs(x));

/** Runs the frames through advanceClock, returning every intermediate clock (index 0 is the initial clock). */
function run(initial: Clock, frames: Frame[], maxDt: number): Clock[] {
  const states = [initial];
  for (const { now, visible } of frames) {
    states.push(advanceClock(states[states.length - 1], now, visible, maxDt));
  }
  return states;
}

describe("Property 39: Visible-only animation clock", () => {
  it("never decreases, never advances on hidden frames, and advances at most maxDt per frame", () => {
    fc.assert(
      fc.property(arbStartElapsed, arbFrames, arbMaxDt, (startElapsed, frames, maxDt) => {
        const states = run(createClock(startElapsed), frames, maxDt);
        expect(states[0]).toEqual({ elapsed: startElapsed, last: null });
        frames.forEach((frame, i) => {
          const prev = states[i];
          const next = states[i + 1];
          const step = next.elapsed - prev.elapsed;
          expect(step).toBeGreaterThanOrEqual(0);
          expect(step).toBeLessThanOrEqual(maxDt + ulpTol(next.elapsed));
          if (!frame.visible) {
            // Hidden: paused, and the reference timestamp is dropped.
            expect(next.elapsed).toBe(prev.elapsed);
            expect(next.last).toBeNull();
          } else {
            expect(next.last).toBe(frame.now);
            // First visible frame after start or a hidden period records `now` and advances 0.
            if (prev.last === null) expect(next.elapsed).toBe(prev.elapsed);
          }
        });
      }),
    );
  });

  it("accumulates only capped visible-to-visible gaps (no catch-up after resume)", () => {
    fc.assert(
      fc.property(arbStartElapsed, arbFrames, arbMaxDt, (startElapsed, frames, maxDt) => {
        const states = run(createClock(startElapsed), frames, maxDt);
        const final = states[states.length - 1];

        // Model: only consecutive visible→visible frame pairs contribute, each capped at maxDt.
        let expected = startElapsed;
        let visibleGapSum = 0;
        let visiblePairs = 0;
        for (let i = 1; i < frames.length; i++) {
          if (frames[i - 1].visible && frames[i].visible) {
            const gap = frames[i].now - frames[i - 1].now;
            expected += Math.min(Math.max(gap, 0), maxDt);
            visibleGapSum += gap;
            visiblePairs++;
          }
        }
        const advanced = final.elapsed - startElapsed;
        expect(final.elapsed).toBe(expected);
        // Tolerance covers float rounding in the subtraction above.
        const eps = 1e-6 * Math.max(1, final.elapsed);
        expect(advanced).toBeLessThanOrEqual(visibleGapSum + eps);
        expect(advanced).toBeLessThanOrEqual(visiblePairs * maxDt + eps);
      }),
    );
  });

  it("never decreases even for out-of-order or non-finite timestamps", () => {
    const arbNow = fc.oneof(
      fc.double({ min: -1e7, max: 1e7, noNaN: true, noDefaultInfinity: true }),
      fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
    );
    fc.assert(
      fc.property(
        arbStartElapsed,
        fc.array(fc.record({ now: arbNow, visible: fc.boolean() }), { maxLength: 60 }),
        arbMaxDt,
        (startElapsed, frames, maxDt) => {
          const states = run(createClock(startElapsed), frames, maxDt);
          for (let i = 1; i < states.length; i++) {
            const step = states[i].elapsed - states[i - 1].elapsed;
            expect(Number.isFinite(states[i].elapsed)).toBe(true);
            expect(step).toBeGreaterThanOrEqual(0);
            expect(step).toBeLessThanOrEqual(maxDt + ulpTol(states[i].elapsed));
          }
        },
      ),
    );
  });
});
