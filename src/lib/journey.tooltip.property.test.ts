// Feature: portfolio-website, Property 13: Tooltip state machine —
// for any number of markers and any sequence of pointerEnter, pointerLeave, tap, focus, blur,
// activate, escape and outside events, journeyTooltipReducer keeps at most one tooltip open.
// pointerEnter/focus/activate on marker i open i (closing any other). A tap on a closed marker
// opens it and a tap on the open marker closes it. escape, outside, blur and pointerLeave of the
// open marker close it. Escape never changes the focused marker.
// **Validates: Requirements 19.1, 19.2, 19.17, 19.19, 19.20, 19.21**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { INITIAL_TOOLTIP_STATE, journeyTooltipReducer, type TooltipEvent, type TooltipState } from "./journey";

const indexedTypes = ["pointerEnter", "pointerLeave", "tap", "focus", "blur", "activate"] as const;

/** One event over markers 0..n-1. */
const arbEvent = (n: number): fc.Arbitrary<TooltipEvent> =>
  fc.oneof(
    fc.record({ type: fc.constantFrom(...indexedTypes), index: fc.integer({ min: 0, max: n - 1 }) }),
    fc.constantFrom<TooltipEvent>({ type: "escape" }, { type: "outside" }),
  );

/** 1–8 markers (journey stage count) and a sequence of events over them. */
const arbScenario = fc
  .integer({ min: 1, max: 8 })
  .chain((n) => fc.record({ n: fc.constant(n), events: fc.array(arbEvent(n), { maxLength: 40 }) }));

// ---------- independent model ----------

/** Plain-language transition table, written separately from the reducer. */
function model(s: { open: number | null; focused: number | null }, e: TooltipEvent) {
  let { open, focused } = s;
  if (e.type === "escape" || e.type === "outside") {
    open = null; // focus untouched
  } else if (e.type === "pointerEnter" || e.type === "activate") {
    open = e.index;
  } else if (e.type === "focus") {
    open = e.index;
    focused = e.index;
  } else if (e.type === "tap") {
    open = open === e.index ? null : e.index;
  } else if (e.type === "pointerLeave") {
    if (open === e.index) open = null;
  } else if (e.type === "blur") {
    if (open === e.index) open = null;
    if (focused === e.index) focused = null;
  }
  return { open, focused };
}

const validIndex = (v: number | null, n: number) => v === null || (Number.isInteger(v) && v >= 0 && v < n);

describe("Property 13: Tooltip state machine", () => {
  it("matches the independent model, keeps at most one open and returns the same object when unchanged", () => {
    fc.assert(
      fc.property(arbScenario, ({ n, events }) => {
        let s: TooltipState = INITIAL_TOOLTIP_STATE;
        let m = { open: null as number | null, focused: null as number | null };
        expect(s).toEqual(m);

        for (const e of events) {
          const prev = s;
          s = journeyTooltipReducer(s, e);
          m = model(m, e);

          // State is a single nullable index: at most one tooltip open, always a real marker.
          expect({ open: s.open, focused: s.focused }).toEqual(m);
          expect(validIndex(s.open, n)).toBe(true);
          expect(validIndex(s.focused, n)).toBe(true);

          // Same object when nothing changed; a fresh object otherwise (React bail-out).
          const unchanged = prev.open === s.open && prev.focused === s.focused;
          if (unchanged) expect(s).toBe(prev);
          else expect(s).not.toBe(prev);
        }
      }),
    );
  });

  it("opening marker i replaces any previously open tooltip; tap toggles", () => {
    fc.assert(
      fc.property(arbScenario, fc.nat(), ({ n, events }, pick) => {
        const s = events.reduce(journeyTooltipReducer, INITIAL_TOOLTIP_STATE);
        const i = pick % n;

        for (const type of ["pointerEnter", "focus", "activate"] as const) {
          const after = journeyTooltipReducer(s, { type, index: i });
          expect(after.open).toBe(i);
          if (type === "focus") expect(after.focused).toBe(i);
          else expect(after.focused).toBe(s.focused);
        }

        const tapped = journeyTooltipReducer(s, { type: "tap", index: i });
        expect(tapped.open).toBe(s.open === i ? null : i);
        expect(tapped.focused).toBe(s.focused);
      }),
    );
  });

  it("escape/outside close without moving focus; blur/pointerLeave close only their own marker", () => {
    fc.assert(
      fc.property(arbScenario, fc.nat(), ({ n, events }, pick) => {
        const s = events.reduce(journeyTooltipReducer, INITIAL_TOOLTIP_STATE);
        const i = pick % n;

        for (const e of [{ type: "escape" }, { type: "outside" }] as const) {
          const after = journeyTooltipReducer(s, e);
          expect(after.open).toBeNull();
          expect(after.focused).toBe(s.focused);
        }

        const left = journeyTooltipReducer(s, { type: "pointerLeave", index: i });
        expect(left.open).toBe(s.open === i ? null : s.open);
        expect(left.focused).toBe(s.focused);

        const blurred = journeyTooltipReducer(s, { type: "blur", index: i });
        expect(blurred.open).toBe(s.open === i ? null : s.open);
        expect(blurred.focused).toBe(s.focused === i ? null : s.focused);
      }),
    );
  });
});
