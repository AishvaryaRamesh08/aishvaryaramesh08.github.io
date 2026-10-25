// Feature: portfolio-website, Property 19: History model —
// for any sequence of submitted inputs, the history after each step equals a reference model:
// blank inputs change nothing, `clear` empties it, and any other input appends one entry, keeping
// only the 50 most recent entries in submission order (oldest dropped first).
// **Validates: Requirements 24.2, 24.8, 24.10**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { TerminalEntry } from "../data/types";
import {
  DEFAULT_MAX_HISTORY,
  defaultTerminalContext,
  historyReducer,
  normalizeCommand,
  runCommand,
  TERMINAL_COMMANDS,
  type TerminalAction,
} from "./terminal";

/** Reference model: the kept commands/outputs in submission order plus the next id to assign. */
interface Model {
  entries: { command: string; output: readonly string[] }[];
  nextId: number;
}

/** Applies an action to the model: noop unchanged, clear empties and restarts ids, append keeps last `max`. */
function modelStep(m: Model, a: TerminalAction, max: number): Model {
  switch (a.type) {
    case "noop":
      return m;
    case "clear":
      return { entries: [], nextId: 0 };
    case "append": {
      const entries = [...m.entries, { command: a.command, output: a.output }];
      return { entries: entries.slice(Math.max(0, entries.length - max)), nextId: m.nextId + 1 };
    }
  }
}

/** Whitespace that `String.prototype.trim` strips. */
const arbBlank = fc.stringMatching(/^[ \t\n\r]{0,4}$/);

/** Randomly upper-cases characters so inputs exercise normalization. */
const arbCaseMix = (s: string) =>
  fc
    .array(fc.boolean(), { minLength: s.length, maxLength: s.length })
    .map((flags) => [...s].map((ch, i) => (flags[i] ? ch.toUpperCase() : ch)).join(""));

/** Raw submitted inputs: blanks, padded/mixed-case `clear`, other supported commands, arbitrary text. */
const arbInput = fc.oneof(
  { weight: 2, arbitrary: arbBlank },
  {
    weight: 1,
    arbitrary: fc
      .tuple(arbBlank, arbCaseMix("clear"), arbBlank)
      .map(([l, c, r]) => `${l}${c}${r}`),
  },
  {
    weight: 4,
    arbitrary: fc
      .tuple(arbBlank, fc.constantFrom(...TERMINAL_COMMANDS).chain(arbCaseMix), arbBlank)
      .map(([l, c, r]) => `${l}${c}${r}`),
  },
  { weight: 4, arbitrary: fc.string({ maxLength: 12 }) },
);

/** Direct reducer actions, with clear/noop rare enough that histories regularly exceed small maxes. */
const arbAction: fc.Arbitrary<TerminalAction> = fc.oneof(
  {
    weight: 8,
    arbitrary: fc.record({
      type: fc.constant("append" as const),
      command: fc.string({ maxLength: 8 }),
      output: fc.array(fc.string({ maxLength: 10 }), { maxLength: 3 }),
    }),
  },
  { weight: 1, arbitrary: fc.constant({ type: "clear" as const }) },
  { weight: 1, arbitrary: fc.constant({ type: "noop" as const }) },
);

/** Asserts one reducer step against the model and the structural invariants. */
function checkStep(
  prev: readonly TerminalEntry[],
  next: readonly TerminalEntry[],
  action: TerminalAction,
  model: Model,
  max: number,
) {
  // Matches the reference model, in submission order.
  expect(next.map(({ command, output }) => ({ command, output }))).toEqual(model.entries);
  expect(next.length).toBeLessThanOrEqual(max);

  // Ids are consecutive (one per append), end at the model counter, and are unique.
  next.forEach((e, i) => {
    if (i > 0) expect(e.id).toBe(next[i - 1].id + 1);
  });
  if (next.length > 0) expect(next[next.length - 1].id).toBe(model.nextId - 1);
  expect(new Set(next.map((e) => e.id)).size).toBe(next.length);

  if (action.type === "noop") expect(next).toBe(prev);
  if (action.type === "clear") {
    expect(next).toEqual([]);
    if (prev.length === 0) expect(next).toBe(prev);
  }
  if (action.type === "append") {
    // Surviving earlier entries are the very same objects, in the same order.
    const kept = next.slice(0, -1);
    const dropped = prev.length - kept.length;
    expect(dropped).toBeGreaterThanOrEqual(0);
    kept.forEach((e, i) => expect(e).toBe(prev[dropped + i]));
    const last = next[next.length - 1];
    expect(last.command).toBe(action.command);
    expect(last.output).toEqual(action.output);
  }
}

describe("Property 19: History model", () => {
  it("submitted inputs drive the default 50-entry history exactly like the reference model", () => {
    fc.assert(
      fc.property(fc.array(arbInput, { maxLength: 120 }), (inputs) => {
        let history: readonly TerminalEntry[] = [];
        let model: Model = { entries: [], nextId: 0 };

        for (const input of inputs) {
          const action = runCommand(input, defaultTerminalContext);
          const normalized = normalizeCommand(input);
          if (normalized === "") expect(action).toEqual({ type: "noop" });
          else if (normalized === "clear") expect(action).toEqual({ type: "clear" });
          else expect(action.type).toBe("append");

          const prev = history;
          const snapshot = structuredClone(prev);
          history = historyReducer(prev, action);
          model = modelStep(model, action, DEFAULT_MAX_HISTORY);

          checkStep(prev, history, action, model, DEFAULT_MAX_HISTORY);
          // The previous history value is never mutated.
          expect(prev).toEqual(snapshot);
        }
      }),
    );
  });

  it("arbitrary action sequences match the model for any max", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.array(arbAction, { maxLength: 150 }),
        (max, actions) => {
          let history: readonly TerminalEntry[] = [];
          let model: Model = { entries: [], nextId: 0 };

          for (const action of actions) {
            const prev = history;
            const snapshot = structuredClone(prev);
            history = historyReducer(prev, action, max);
            model = modelStep(model, action, max);

            checkStep(prev, history, action, model, max);
            expect(prev).toEqual(snapshot);
          }
        },
      ),
    );
  });

  it("blank input is a noop that returns the same history array", () => {
    fc.assert(
      fc.property(arbBlank, fc.array(arbAction, { maxLength: 20 }), (blank, actions) => {
        const history = actions.reduce<readonly TerminalEntry[]>((h, a) => historyReducer(h, a), []);
        const action = runCommand(blank, defaultTerminalContext);
        expect(action).toEqual({ type: "noop" });
        expect(historyReducer(history, action)).toBe(history);
      }),
    );
  });
});
