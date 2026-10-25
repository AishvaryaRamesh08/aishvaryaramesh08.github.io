// Feature: portfolio-website, Property 30: Asset reference check —
// for any set of referenced asset paths (with possible duplicates) and set of existing files, the
// asset validators report exactly the referenced paths that do not exist (each named in its error)
// and exactly the paths referenced by more than one entry.
// **Validates: Requirements 4.6, 4.7**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkAssetsExist, checkAssetsUnique, type AssetRef } from "./assets";
import type { FileFacts } from "./types";

/**
 * Small pool of normalized relative paths, so generated ref lists hit duplicates and the
 * existing-files set overlaps the refs often.
 */
const POOL = ["hook", "viz", "projects", "certs"].flatMap((dir) =>
  ["a", "b", "c"].flatMap((name) => ["webp", "svg"].map((ext) => `${dir}/${name}.${ext}`)),
);

/** Spellings the Content_Config may use for the same file under `/src/assets/`. */
const PREFIXES = ["", "./", "/", "src/assets/", "/src/assets/", "./src/assets/"];

const FILES = ["hook.ts", "viz.ts", "projects.ts", "analysis.ts", "certifications.ts", "builtWithAi.ts"];

/** A reference: a normalized key plus how it is spelled in the Content_Config. */
const arbRefSpec = fc.record({
  key: fc.constantFrom(...POOL),
  prefix: fc.constantFrom(...PREFIXES),
  file: fc.constantFrom(...FILES),
});

const arbRefs: fc.Arbitrary<AssetRef[]> = fc
  .array(arbRefSpec, { maxLength: 12 })
  .map((specs) => specs.map(({ key, prefix, file }, i) => ({ file, path: `entries[${i}].src`, src: `${prefix}${key}` })));

/** Existing files: any subset of the pool, plus files nothing references. */
const arbExisting: fc.Arbitrary<ReadonlyMap<string, FileFacts>> = fc
  .tuple(fc.subarray(POOL), fc.subarray(["fonts/inter.woff2", "unused/extra.png"]))
  .map(([a, b]) => new Map([...a, ...b].map((k) => [k, {}] as const)));

/** Index of the entry an error belongs to, parsed from its field path. */
const indexOf = (path: string): number => Number(/^entries\[(\d+)\]\.src$/.exec(path)?.[1] ?? NaN);

describe("Property 30: Asset reference check", () => {
  it("reports exactly the refs whose file does not exist, each naming the missing file", () => {
    fc.assert(
      fc.property(arbRefs, arbExisting, (refs, existing) => {
        // Independent oracle: compare against the pool key, not the validator's normalization.
        const keyOf = (ref: AssetRef): string => POOL.find((k) => ref.src.endsWith(k)) ?? "";
        const expected = refs.flatMap((ref, i) => (existing.has(keyOf(ref)) ? [] : [i]));

        const errors = checkAssetsExist(refs, existing);

        expect(errors.map((e) => indexOf(e.path))).toEqual(expected);
        for (const e of errors) {
          const ref = refs[indexOf(e.path)];
          expect(e.file).toBe(ref.file);
          expect(e.message).toBe(`file "${keyOf(ref)}" not found`);
        }
        // No error when every referenced file exists.
        expect(errors.length === 0).toBe(refs.every((ref) => existing.has(keyOf(ref))));
      }),
    );
  });

  it("reports exactly the paths referenced by more than one entry, one error per extra reference", () => {
    fc.assert(
      fc.property(arbRefs, (refs) => {
        const keyOf = (ref: AssetRef): string => POOL.find((k) => ref.src.endsWith(k)) ?? "";
        const firstIndex = new Map<string, number>();
        const expected: number[] = [];
        refs.forEach((ref, i) => {
          const key = keyOf(ref);
          if (firstIndex.has(key)) expected.push(i);
          else firstIndex.set(key, i);
        });
        const counts = new Map<string, number>();
        for (const ref of refs) counts.set(keyOf(ref), (counts.get(keyOf(ref)) ?? 0) + 1);
        const duplicated = [...counts].filter(([, n]) => n > 1).map(([k]) => k).sort();

        const errors = checkAssetsUnique(refs);

        // One error per reference after the first to the same file, attributed to that entry.
        expect(errors.map((e) => indexOf(e.path))).toEqual(expected);
        // The set of files named in errors is exactly the set referenced more than once.
        const named = [...new Set(errors.map((e) => /^file "([^"]+)"/.exec(e.message)?.[1]))].sort();
        expect(named).toEqual(duplicated);
        for (const e of errors) {
          const ref = refs[indexOf(e.path)];
          const owner = refs[firstIndex.get(keyOf(ref)) ?? -1];
          expect(e.file).toBe(ref.file);
          // The error points at the entry that already owns the file, so the Owner can reuse it.
          expect(e.message).toContain(`${owner.file} › ${owner.path}`);
        }
      }),
    );
  });
});
