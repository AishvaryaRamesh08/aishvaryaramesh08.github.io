// Feature: portfolio-website, Property 12: Journey content validation —
// for any array of JourneyStage objects, the validator reports blank required text and detail lines,
// identifying the offending index and field, or the empty array.
// **Validates: Requirements 19.10**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { JourneyStage } from "../../data/types";
import { checkJourney, journey, JOURNEY_FIELDS } from "./journey";

/** Whitespace characters JS treats as blank, including non-ASCII ones (NBSP, em space, BOM, …). */
const WHITESPACE = [" ", "\t", "\n", "\r", "\v", "\f", "\u00a0", "\u1680", "\u2003", "\u2028", "\u3000", "\ufeff"];

/** Empty or whitespace-only string. */
const arbBlank = fc.array(fc.constantFrom(...WHITESPACE), { maxLength: 6 }).map((chars) => chars.join(""));

/** String with at least one non-whitespace character, possibly padded with whitespace. */
const arbText = fc
  .tuple(arbBlank, fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /\S/.test(s)), arbBlank)
  .map(([pre, core, post]) => `${pre}${core}${post}`);

/** Field value: blank or real text, with roughly even odds so both cases are well covered. */
const arbField = fc.oneof(arbBlank, arbText);

const arbStage: fc.Arbitrary<JourneyStage> = fc.record({
  label: arbField,
  organization: arbField,
  role: arbField,
  years: arbField,
  detail: fc.array(arbField, { minLength: 2, maxLength: 4 }),
});

/** Independent oracle: a field is blank when it has no non-whitespace character. */
const isBlank = (s: string): boolean => !/\S/.test(s);

describe("Property 12: Journey content validation", () => {
  it("reports a file-level error for an empty array", () => {
    const errors = checkJourney([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ file: "journey.ts", path: "" });
    expect(errors[0].message).toMatch(/empty/i);
  });

  it("reports exactly one error per blank field, at path [i].field, and none otherwise", () => {
    fc.assert(
      fc.property(fc.array(arbStage, { minLength: 1, maxLength: 8 }), (stages) => {
        const expected = stages.flatMap((stage, i) => [
          ...JOURNEY_FIELDS.filter((field) => isBlank(stage[field])).map((field) => `[${i}].${field}`),
          ...stage.detail.flatMap((line, detailIndex) =>
            isBlank(line) ? [`[${i}].detail[${detailIndex}]`] : [],
          ),
        ]);

        const errors = journey({ journey: stages });

        expect(errors.map((e) => e.path)).toEqual(expected);
        for (const e of errors) {
          expect(e.file).toBe("journey.ts");
          const [, index, field] = /^\[(\d+)\]\.([\w[\]]+)$/.exec(e.path) ?? [];
          expect(e.message).toContain(index);
          expect(e.message).toContain(field.split("[")[0]);
        }
        expect(errors.length > 0).toBe(
          stages.some((s) => JOURNEY_FIELDS.some((f) => isBlank(s[f])) || s.detail.some(isBlank)),
        );
      }),
    );
  });
});
