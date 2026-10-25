// Feature: portfolio-website, Property 16: Command normalization —
// for any input string s, runCommand(s) deep-equals runCommand(s.trim().toLowerCase()).
// **Validates: Requirements 24.5**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  TERMINAL_COMMANDS,
  defaultTerminalContext,
  normalizeCommand,
  runCommand,
  type TerminalContext,
} from "./terminal";

/** Every character String.prototype.trim removes (ECMAScript WhiteSpace + LineTerminator). */
const TRIMMABLE = [
  " ", "\t", "\n", "\v", "\f", "\r", "\u00a0", "\ufeff", "\u1680",
  "\u2000", "\u2001", "\u2002", "\u2003", "\u2004", "\u2005", "\u2006", "\u2007", "\u2008",
  "\u2009", "\u200a", "\u2028", "\u2029", "\u202f", "\u205f", "\u3000",
];

/** Arbitrary leading/trailing whitespace padding, possibly empty. */
const arbPadding = fc
  .array(fc.constantFrom(...TRIMMABLE), { maxLength: 6 })
  .map((chars) => chars.join(""));

/** A word with each character independently upper- or lower-cased. */
const arbCased = (word: string) =>
  fc
    .array(fc.boolean(), { minLength: word.length, maxLength: word.length })
    .map((flags) => [...word].map((ch, i) => (flags[i] ? ch.toUpperCase() : ch)).join(""));

/** Supported command (canonical) plus a padded, case-varied raw form of it. */
const arbSupportedVariant = fc
  .constantFrom(...TERMINAL_COMMANDS)
  .chain((command) =>
    fc
      .tuple(arbPadding, arbCased(command), arbPadding)
      .map(([lead, cased, trail]) => ({ command, raw: `${lead}${cased}${trail}` })),
  );

/** Arbitrary strings: full Unicode, padded strings, and padded/cased supported commands. */
const arbInput = fc.oneof(
  fc.string({ unit: "binary", maxLength: 20 }),
  fc.tuple(arbPadding, fc.string({ maxLength: 12 }), arbPadding).map(([a, s, b]) => a + s + b),
  arbSupportedVariant.map((v) => v.raw),
);

/** Page context and a custom one with a stub resolvePath and the resume present. */
const customContext: TerminalContext = {
  ...defaultTerminalContext,
  resumeAvailable: true,
  resolvePath: (path) => `/stub-base/${path}`,
};
const arbContext = fc.constantFrom(defaultTerminalContext, customContext);

describe("Property 16: Command normalization", () => {
  it("runCommand(s) deep-equals runCommand(s.trim().toLowerCase()) for any string", () => {
    fc.assert(
      fc.property(arbInput, arbContext, (raw, ctx) => {
        expect(normalizeCommand(raw)).toBe(raw.trim().toLowerCase());
        expect(runCommand(raw, ctx)).toEqual(runCommand(raw.trim().toLowerCase(), ctx));
        expect(runCommand(raw, ctx)).toEqual(runCommand(normalizeCommand(raw), ctx));
      }),
    );
  });

  it("padded and case-varied supported commands dispatch the same as the canonical command", () => {
    fc.assert(
      fc.property(arbSupportedVariant, arbContext, ({ command, raw }, ctx) => {
        expect(normalizeCommand(raw)).toBe(command);
        const action = runCommand(raw, ctx);
        expect(action).toEqual(runCommand(command, ctx));
        if (command === "clear") {
          expect(action).toEqual({ type: "clear" });
        } else {
          expect(action).toMatchObject({ type: "append", command });
        }
      }),
    );
  });

  it("whitespace-only input is a noop", () => {
    fc.assert(
      fc.property(arbPadding, arbContext, (raw, ctx) => {
        expect(runCommand(raw, ctx)).toEqual({ type: "noop" });
      }),
    );
  });

  it("normalizeCommand is idempotent", () => {
    fc.assert(
      fc.property(arbInput, (raw) => {
        const once = normalizeCommand(raw);
        expect(normalizeCommand(once)).toBe(once);
      }),
    );
  });
});
