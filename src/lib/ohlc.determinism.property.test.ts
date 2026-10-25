// Feature: portfolio-website, Property 8: Seeded generator determinism —
// for any seed and valid generator config, calling generateOhlc twice returns deeply equal
// datasets (and byte-identical serializeOhlc output); mulberry32 replays the same sequence for the
// same seed. Example companion: generateOhlc(liveDemo) reproduces public/data/ohlc-sample.json.
// **Validates: Requirements 15.11**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import bundled from "../../public/data/ohlc-sample.json";
import bundledText from "../../public/data/ohlc-sample.json?raw";
import { liveDemo } from "../data/liveDemo";
import { generateOhlc, mulberry32, parseOhlcDataset, serializeOhlc, type OhlcGeneratorConfig } from "./ohlc";

const DAY_MS = 86_400_000;
const MIN_DAY = Date.UTC(1990, 0, 1) / DAY_MS;
const MAX_DAY = Date.UTC(2100, 11, 31) / DAY_MS;

/** A valid "YYYY-MM-DD" calendar date (weekdays and weekends alike). */
const arbIsoDate = fc
  .integer({ min: MIN_DAY, max: MAX_DAY })
  .map((day) => new Date(day * DAY_MS).toISOString().slice(0, 10) as OhlcGeneratorConfig["startDate"]);

/** Seeds the generator treats as distinct: unsigned 32-bit integers. */
const arbUint32Seed = fc.integer({ min: 0, max: 0xffff_ffff });

/** Any accepted seed: uint32 integers plus arbitrary finite numbers (negatives, fractions, large). */
const arbSeed = fc.oneof(arbUint32Seed, fc.double({ noNaN: true, noDefaultInfinity: true }));

/** Valid config with the seed supplied separately. */
const arbConfigWithoutSeed = fc.record({
  symbol: fc.string({ maxLength: 8 }),
  startDate: arbIsoDate,
  tradingDays: fc.integer({ min: 0, max: 60 }),
  startPrice: fc.double({ min: 0.01, max: 100_000, noNaN: true }),
  drift: fc.double({ min: -0.05, max: 0.05, noNaN: true }),
  volatility: fc.double({ min: 0, max: 0.5, noNaN: true }),
});

const arbConfig: fc.Arbitrary<OhlcGeneratorConfig> = fc
  .tuple(arbSeed, arbConfigWithoutSeed)
  .map(([seed, rest]) => ({ seed, ...rest }));

describe("Property 8: Seeded generator determinism", () => {
  it("two calls with the same config return deep-equal datasets and identical serializations", () => {
    fc.assert(
      fc.property(arbConfig, (cfg) => {
        const a = generateOhlc(cfg);
        const b = generateOhlc({ ...cfg });
        expect(b).toEqual(a);
        expect(serializeOhlc(b)).toBe(serializeOhlc(a));
      }),
    );
  });

  it("output does not depend on calls made in between (no hidden shared state)", () => {
    fc.assert(
      fc.property(arbConfig, fc.array(arbConfig, { maxLength: 3 }), (cfg, others) => {
        const before = generateOhlc(cfg);
        for (const other of others) generateOhlc(other);
        expect(generateOhlc(cfg)).toEqual(before);
      }),
    );
  });

  it("mulberry32 yields identical sequences for the same seed", () => {
    fc.assert(
      fc.property(arbSeed, fc.integer({ min: 1, max: 200 }), (seed, n) => {
        const r1 = mulberry32(seed);
        const r2 = mulberry32(seed);
        const s1 = Array.from({ length: n }, r1);
        const s2 = Array.from({ length: n }, r2);
        expect(s2).toEqual(s1);
        for (const v of s1) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(1);
        }
      }),
    );
  });

  // Weaker, statistical companion: distinct uint32 seeds feed mulberry32 distinct states, so over
  // ≥ 10 days with non-zero volatility a collision of the cent-rounded series is vanishingly rare.
  it("distinct seeds produce different price series (non-trivial volatility, ≥ 10 days)", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(arbUint32Seed, { minLength: 2, maxLength: 2 }),
        arbConfigWithoutSeed.map((rest) => ({
          ...rest,
          tradingDays: Math.max(10, rest.tradingDays),
          startPrice: Math.max(10, rest.startPrice),
          volatility: Math.max(0.01, rest.volatility),
        })),
        ([s1, s2], rest) => {
          const a = generateOhlc({ ...rest, seed: s1 });
          const b = generateOhlc({ ...rest, seed: s2 });
          expect(a.dates).toEqual(b.dates);
          expect([a.open, a.high, a.low, a.close]).not.toEqual([b.open, b.high, b.low, b.close]);
        },
      ),
    );
  });

  it("the fixed seed reproduces public/data/ohlc-sample.json, regardless of prior generator calls", () => {
    const expected = parseOhlcDataset(bundled);
    fc.assert(
      fc.property(fc.array(arbConfig, { maxLength: 3 }), (others) => {
        for (const other of others) generateOhlc(other);
        const d = generateOhlc(liveDemo);
        expect(d).toEqual(expected);
        // Byte-for-byte: the committed file is exactly what scripts/generate-ohlc.ts would write.
        expect(serializeOhlc(d)).toBe(bundledText);
      }),
    );
  });
});
