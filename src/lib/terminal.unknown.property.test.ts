// Feature: portfolio-website, Property 17: Unknown commands —
// for any non-blank input whose normalized form is not a supported command, runCommand returns an
// entry whose output contains the normalized command and all seven supported command names.
// Applying it through historyReducer leaves all earlier entries unchanged.
// **Validates: Requirements 24.4**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { TerminalEntry } from "../data/types";
import {
  defaultTerminalContext,
  historyReducer,
  normalizeCommand,
  runCommand,
  TERMINAL_COMMANDS,
  type TerminalAction,
} from "./terminal";

/** Whitespace that `String.prototype.trim` strips, used to pad inputs. */
const arbPadding = fc.stringMatching(/^[ \t\n\r]{0,3}$/);

/** Randomly upper-cases characters so the input exercises case normalization. */
const arbCaseMix = (s: string) =>
  fc
    .array(fc.boolean(), { minLength: s.length, maxLength: s.length })
    .map((flags) => [...s].map((ch, i) => (flags[i] ? ch.toUpperCase() : ch)).join(""));

/** Core text: arbitrary strings plus near-misses of the real commands (e.g. "helpx", "who ami"). */
const arbCore = fc.oneof(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.stringMatching(/^[a-z][a-z0-9 _-]{0,12}$/),
  fc
    .tuple(fc.constantFrom(...TERMINAL_COMMANDS), fc.stringMatching(/^[a-z0-9 -]{1,4}$/), fc.boolean())
    .map(([cmd, extra, prefix]) => (prefix ? `${extra}${cmd}` : `${cmd}${extra}`)),
);

/** Raw input whose normalized form is non-blank and not one of the seven supported commands. */
const arbUnknownInput = fc
  .tuple(arbPadding, arbCore.chain(arbCaseMix), arbPadding)
  .map(([lead, core, trail]) => `${lead}${core}${trail}`)
  .filter((input) => {
    const normalized = normalizeCommand(input);
    return normalized !== "" && !(TERMINAL_COMMANDS as readonly string[]).includes(normalized);
  });

/** Supported command with optional padding and mixed case. */
const arbSupportedInput = fc
  .tuple(arbPadding, fc.constantFrom(...TERMINAL_COMMANDS).chain(arbCaseMix), arbPadding)
  .map(([lead, cmd, trail]) => `${lead}${cmd}${trail}`);

/** An existing history built by appending arbitrary entries. */
const arbHistory = fc
  .array(
    fc.record({
      command: fc.string({ maxLength: 12 }),
      output: fc.array(fc.string({ maxLength: 20 }), { maxLength: 3 }),
    }),
    { maxLength: 10 },
  )
  .map((entries) =>
    entries.reduce<readonly TerminalEntry[]>(
      (h, e) => historyReducer(h, { type: "append", command: e.command, output: e.output }),
      [],
    ),
  );

const unknownPrefix = "command not found:";

describe("Property 17: Unknown commands", () => {
  it("returns one line naming the normalized command and listing all seven supported commands", () => {
    fc.assert(
      fc.property(arbUnknownInput, (input) => {
        const normalized = normalizeCommand(input);
        const action = runCommand(input, defaultTerminalContext);

        expect(action.type).toBe("append");
        const { command, output } = action as Extract<TerminalAction, { type: "append" }>;
        expect(command).toBe(normalized);
        expect(output).toHaveLength(1);

        const [line] = output;
        expect(line).toBe(defaultTerminalContext.config.unknown(normalized, TERMINAL_COMMANDS));
        expect(line).toContain(normalized);
        // The supported list follows the echoed command, so check that tail for every name.
        const list = line.slice(line.lastIndexOf("Supported commands:"));
        for (const cmd of TERMINAL_COMMANDS) expect(list).toContain(cmd);
      }),
    );
  });

  it("appending the unknown-command entry leaves every earlier entry unchanged", () => {
    fc.assert(
      fc.property(arbHistory, arbUnknownInput, (history, input) => {
        const before = structuredClone(history);
        const next = historyReducer(history, runCommand(input, defaultTerminalContext));

        expect(history).toEqual(before);
        expect(next).toHaveLength(history.length + 1);
        expect(next.slice(0, history.length)).toEqual(before);
        expect(next[next.length - 1].command).toBe(normalizeCommand(input));
      }),
    );
  });

  it("supported commands never produce the unknown-command message", () => {
    fc.assert(
      fc.property(arbSupportedInput, (input) => {
        const action = runCommand(input, defaultTerminalContext);
        if (action.type === "append") {
          for (const line of action.output) expect(line.startsWith(unknownPrefix)).toBe(false);
        } else {
          expect(action.type).toBe("clear");
        }
      }),
    );
  });
});
