// Feature: portfolio-website, Property 7: OHLC dataset JSON round trip —
// for any valid OhlcDataset (equal-length columns, finite values),
// parseOhlcDataset(JSON.parse(serializeOhlc(d))) is deeply equal to d.
// Also covers generator output round-tripping and malformed datasets being rejected.
// **Validates: Requirements 15.9**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { OhlcDataset } from "../data/types";
import { generateOhlc, OhlcParseError, parseOhlcDataset, serializeOhlc, type OhlcGeneratorConfig } from "./ohlc";

const roundTrip = (d: OhlcDataset): OhlcDataset => parseOhlcDataset(JSON.parse(serializeOhlc(d)));

/** Valid "YYYY-MM-DD" calendar date (four-digit years so toISOString stays in that shape). */
const arbIsoDate = fc
  .date({ min: new Date("1900-01-01T00:00:00Z"), max: new Date("2199-12-31T23:59:59Z"), noInvalidDate: true })
  .map((d) => d.toISOString().slice(0, 10));

/** Finite number; `x + 0` turns -0 into +0 because JSON cannot represent -0. */
const arbFinite = fc
  .oneof(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.integer(), fc.integer({ min: 1, max: 1_000_000 }).map((c) => c / 100))
  .map((x) => x + 0);

const arbDatasetOfLength = (n: number): fc.Arbitrary<OhlcDataset> => {
  const col = fc.array(arbFinite, { minLength: n, maxLength: n });
  // Spread into a plain object: fc.record yields null-prototype objects, which toStrictEqual
  // would distinguish from the parser's plain-object output.
  return fc
    .record({
      version: fc.constant(1 as const),
      seed: arbFinite,
      symbol: fc.string({ unit: "binary", maxLength: 20 }),
      dates: fc.array(arbIsoDate, { minLength: n, maxLength: n }),
      open: col,
      high: col,
      low: col,
      close: col,
    })
    .map((r) => ({ ...r }));
};

const arbDataset = fc.integer({ min: 0, max: 30 }).chain(arbDatasetOfLength);
const arbNonEmptyDataset = fc.integer({ min: 1, max: 30 }).chain(arbDatasetOfLength);

const arbConfig: fc.Arbitrary<OhlcGeneratorConfig> = fc.record({
  seed: fc.integer(),
  symbol: fc.string({ maxLength: 12 }),
  startDate: arbIsoDate as fc.Arbitrary<OhlcGeneratorConfig["startDate"]>,
  tradingDays: fc.integer({ min: 0, max: 120 }),
  startPrice: fc.double({ min: 0.01, max: 10_000, noNaN: true }),
  drift: fc.double({ min: -0.05, max: 0.05, noNaN: true }),
  volatility: fc.double({ min: 0, max: 0.5, noNaN: true }),
}).map((r) => ({ ...r }));

type Json = Record<string, unknown>;
type Mutation = { path: string; apply: (o: Json) => unknown };
const COLUMNS = ["open", "high", "low", "close"] as const;
const notOne = fc.constantFrom<unknown>(2, 0, "1", null, undefined, true, 1.5);
const notFiniteNumber = fc.constantFrom<unknown>("1", null, undefined, true, [], {}, NaN, Infinity, -Infinity);
const notString = fc.constantFrom<unknown>(1, null, undefined, true, [], {});
const notArray = fc.constantFrom<unknown>("[]", null, undefined, 3, {});
const badDate = fc.constantFrom<unknown>("2024-02-30", "2023-02-29", "2024-13-01", "2024-1-01", "20240101", "", 20240101, null);

/** A single targeted corruption of a valid dataset (n ≥ 1 rows) plus the path it must report. */
const arbMutation = (n: number): fc.Arbitrary<Mutation> => {
  const idx = fc.integer({ min: 0, max: n - 1 });
  const col = fc.constantFrom(...COLUMNS);
  return fc.oneof(
    fc.constantFrom<unknown>(null, [], "x", 1).map((root): Mutation => ({ path: "$", apply: () => root })),
    notOne.map((v): Mutation => ({ path: "version", apply: (o) => ({ ...o, version: v }) })),
    notFiniteNumber.map((v): Mutation => ({ path: "seed", apply: (o) => ({ ...o, seed: v }) })),
    notString.map((v): Mutation => ({ path: "symbol", apply: (o) => ({ ...o, symbol: v }) })),
    notArray.map((v): Mutation => ({ path: "dates", apply: (o) => ({ ...o, dates: v }) })),
    fc.tuple(idx, badDate).map(
      ([i, v]): Mutation => ({
        path: `dates[${i}]`,
        apply: (o) => ({ ...o, dates: (o.dates as unknown[]).map((d, j) => (j === i ? v : d)) }),
      }),
    ),
    fc.tuple(col, notArray).map(([k, v]): Mutation => ({ path: k, apply: (o) => ({ ...o, [k]: v }) })),
    fc.tuple(col, fc.boolean()).map(
      ([k, grow]): Mutation => ({
        path: k,
        apply: (o) => {
          const c = o[k] as unknown[];
          return { ...o, [k]: grow ? [...c, 1] : c.slice(1) };
        },
      }),
    ),
    fc.tuple(col, idx, notFiniteNumber).map(
      ([k, i, v]): Mutation => ({
        path: `${k}[${i}]`,
        apply: (o) => ({ ...o, [k]: (o[k] as unknown[]).map((x, j) => (j === i ? v : x)) }),
      }),
    ),
  );
};

describe("Property 7: OHLC dataset JSON round trip", () => {
  it("parseOhlcDataset(JSON.parse(serializeOhlc(d))) deep-equals d for any valid dataset", () => {
    fc.assert(
      fc.property(arbDataset, (d) => {
        const parsed = roundTrip(d);
        expect(parsed).toStrictEqual(d);
        expect(parsed).not.toBe(d);
      }),
    );
  });

  it("drops unknown keys and returns only the known fields", () => {
    fc.assert(
      fc.property(arbDataset, fc.dictionary(fc.stringMatching(/^x_[a-z]{1,6}$/), fc.jsonValue()), (d, extra) => {
        const json = { ...(JSON.parse(serializeOhlc(d)) as Json), ...extra };
        expect(parseOhlcDataset(json)).toStrictEqual(d);
      }),
    );
  });

  it("datasets from generateOhlc round-trip for any valid config", () => {
    fc.assert(
      fc.property(arbConfig, (cfg) => {
        const d = generateOhlc(cfg);
        expect(roundTrip(d)).toStrictEqual(d);
      }),
    );
  });

  it("a single malformed field throws OhlcParseError naming that field", () => {
    fc.assert(
      fc.property(
        arbNonEmptyDataset.chain((d) => fc.tuple(fc.constant(d), arbMutation(d.dates.length))),
        ([d, m]) => {
          const corrupted = m.apply(JSON.parse(serializeOhlc(d)) as Json);
          let error: unknown;
          try {
            parseOhlcDataset(corrupted);
          } catch (e) {
            error = e;
          }
          expect(error).toBeInstanceOf(OhlcParseError);
          expect((error as OhlcParseError).path).toBe(m.path);
        },
      ),
    );
  });
});
