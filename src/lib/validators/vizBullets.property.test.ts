// Feature: portfolio-website, Property 29: Viz bullet check —
// for any list of Viz_Stage entries, the bullet check errors exactly for stages with fewer than 2 or
// more than 3 bullets, or with a bullet longer than 120 characters, and each error names the
// offending stage.
// **Validates: Requirements 14.16**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { VizStage } from "../../data/types";
import { checkVizBullets, VIZ_BULLETS } from "./vizBullets";

/**
 * Single code points, mixing ASCII, BMP non-ASCII and astral characters (emoji, math letters) that
 * take two UTF-16 code units, so `.length` and code-point length disagree.
 */
const arbCodePoint = fc.oneof(
  fc.constantFrom("a", "Z", "7", " ", "-", "."),
  fc.constantFrom("é", "ß", "ñ", "中", "→", "—"),
  fc.constantFrom("😀", "🚀", "📊", "𝔸", "🧪"),
);

/** Bullet length in code points, concentrated around the 120 limit and also covering short ones. */
const arbBulletLength = fc.oneof(
  fc.integer({ min: 0, max: 20 }),
  fc.integer({ min: VIZ_BULLETS.maxChars - 3, max: VIZ_BULLETS.maxChars + 3 }),
  fc.integer({ min: 100, max: 160 }),
);

/** A bullet paired with its known code-point length (the oracle, independent of the validator). */
const arbBullet = arbBulletLength.chain((len) =>
  fc
    .array(arbCodePoint, { minLength: len, maxLength: len })
    .map((chars) => ({ text: chars.join(""), length: len })),
);

/** Bullet counts 0–5 so both too-few, allowed, and too-many cases occur often. */
const arbBullets = fc.array(arbBullet, { minLength: 0, maxLength: 5 });

const arbName = fc.string({ minLength: 1, maxLength: 12 }).filter((s) => !s.includes('"'));

/** Up to 4 stages (Viz_Stage numbers are typed 1–4), numbered in order. */
const arbStages = fc.array(fc.tuple(arbName, arbBullets), { minLength: 0, maxLength: 4 }).map((rows) =>
  rows.map(([name, bullets], i) => ({
    stage: { number: (i + 1) as VizStage["number"], name, changes: bullets.map((b) => b.text) },
    lengths: bullets.map((b) => b.length),
  })),
);

describe("Property 29: Viz bullet check", () => {
  it("errors exactly for bad bullet counts and over-long bullets, naming the offending stage", () => {
    fc.assert(
      fc.property(arbStages, (rows) => {
        const stages = rows.map((r) => r.stage);

        // Oracle: expected error paths, in stage order then bullet order.
        const expected = rows.flatMap(({ lengths }, i) => {
          const paths: string[] = [];
          if (lengths.length < 2 || lengths.length > 3) paths.push(`stages[${i}].changes`);
          lengths.forEach((len, j) => {
            if (len > 120) paths.push(`stages[${i}].changes[${j}]`);
          });
          return paths;
        });

        const errors = checkVizBullets(stages);

        expect(errors.map((e) => e.path)).toEqual(expected);

        for (const e of errors) {
          expect(e.file).toBe("viz.ts");
          const i = Number(/^stages\[(\d+)\]/.exec(e.path)?.[1]);
          const { number, name } = stages[i];
          // Each error names the offending stage by number and name.
          expect(e.message).toContain(`stage ${number} "${name}"`);
          if (e.path === `stages[${i}].changes`) {
            expect(e.message).toContain(`${stages[i].changes.length} bullets (allowed 2–3)`);
          } else {
            const j = Number(/\.changes\[(\d+)\]$/.exec(e.path)?.[1]);
            expect(e.message).toContain(`bullet ${j + 1} is ${rows[i].lengths[j]} characters`);
          }
        }

        // A stage is reported iff it breaks a rule.
        const offending = new Set(errors.map((e) => Number(/^stages\[(\d+)\]/.exec(e.path)?.[1])));
        rows.forEach(({ lengths }, i) => {
          const bad = lengths.length < 2 || lengths.length > 3 || lengths.some((len) => len > 120);
          expect(offending.has(i)).toBe(bad);
        });
      }),
    );
  });

  it("counts code points, not UTF-16 code units", () => {
    const emoji120 = "😀".repeat(120); // 240 code units, 120 code points
    const ok = [{ number: 1 as const, name: "Raw", changes: [emoji120, "short"] }];
    expect(checkVizBullets(ok)).toEqual([]);

    const tooLong = [{ number: 1 as const, name: "Raw", changes: [`${emoji120}a`, "short"] }];
    expect(checkVizBullets(tooLong).map((e) => e.path)).toEqual(["stages[0].changes[0]"]);
  });
});
