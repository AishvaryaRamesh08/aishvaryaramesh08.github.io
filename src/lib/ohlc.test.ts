import { describe, expect, it } from "vitest";
import bundled from "../../public/data/ohlc-sample.json";
import { liveDemo } from "../data/liveDemo";
import type { OhlcDataset } from "../data/types";
import { OhlcParseError, businessDays, generateOhlc, mulberry32, parseOhlcDataset, serializeOhlc } from "./ohlc";
import { mulberry32 as sharedMulberry32 } from "./random";

const sample: OhlcDataset = {
  version: 1,
  seed: 7,
  symbol: "SAMPLE",
  dates: ["2026-01-02", "2026-01-05"],
  open: [100, 100.8],
  high: [101.2, 101.5],
  low: [99.4, 100.1],
  close: [100.8, 101.02],
};

describe("mulberry32", () => {
  it("is the shared PRNG from random.ts", () => {
    expect(mulberry32).toBe(sharedMulberry32);
  });
});

describe("businessDays", () => {
  it("skips weekends and starts at the next weekday when the start is a weekend", () => {
    // 2026-01-02 is a Friday; 2026-01-03 is a Saturday.
    expect(businessDays("2026-01-02", 3)).toEqual(["2026-01-02", "2026-01-05", "2026-01-06"]);
    expect(businessDays("2026-01-03", 2)).toEqual(["2026-01-05", "2026-01-06"]);
    expect(businessDays("2026-01-02", 0)).toEqual([]);
  });

  it("rejects invalid dates", () => {
    expect(() => businessDays("2026-02-30", 1)).toThrow(RangeError);
    expect(() => businessDays("2026-1-2", 1)).toThrow(RangeError);
  });
});

describe("generateOhlc", () => {
  it("reproduces the bundled public/data/ohlc-sample.json from the fixed seed (Req 15.11)", () => {
    expect(generateOhlc(liveDemo)).toEqual(parseOhlcDataset(bundled));
    expect(serializeOhlc(generateOhlc(liveDemo))).toBe(serializeOhlc(parseOhlcDataset(bundled)));
  });

  it("produces tradingDays business-day rows of cent-rounded prices starting at startPrice", () => {
    const d = generateOhlc(liveDemo);
    expect(d).toMatchObject({ version: 1, seed: liveDemo.seed, symbol: liveDemo.symbol });
    expect(d.dates).toHaveLength(liveDemo.tradingDays);
    expect(d.dates[0]).toBe(liveDemo.startDate);
    expect(d.open[0]).toBe(liveDemo.startPrice);
    for (const col of [d.open, d.high, d.low, d.close]) {
      expect(col).toHaveLength(liveDemo.tradingDays);
      for (const v of col) expect(Math.round(v * 100) / 100).toBe(v);
    }
    for (let i = 0; i < d.dates.length; i++) {
      expect(d.low[i]).toBeLessThanOrEqual(Math.min(d.open[i], d.close[i]));
      expect(d.high[i]).toBeGreaterThanOrEqual(Math.max(d.open[i], d.close[i]));
    }
  });

  it("keeps prices positive and ordered under extreme volatility", () => {
    const d = generateOhlc({ ...liveDemo, volatility: 5, drift: -0.5, tradingDays: 60 });
    for (let i = 0; i < d.dates.length; i++) {
      expect(d.low[i]).toBeGreaterThan(0);
      expect(d.low[i]).toBeLessThanOrEqual(Math.min(d.open[i], d.close[i]));
      expect(d.high[i]).toBeGreaterThanOrEqual(Math.max(d.open[i], d.close[i]));
    }
  });

  it.each([
    { tradingDays: -1 },
    { tradingDays: 1.5 },
    { startPrice: 0 },
    { volatility: -0.1 },
    { drift: Number.NaN },
    { seed: Number.POSITIVE_INFINITY },
  ])("rejects an invalid config %j", (override) => {
    expect(() => generateOhlc({ ...liveDemo, ...override })).toThrow(RangeError);
  });
});

describe("serializeOhlc / parseOhlcDataset", () => {
  it("round-trips a dataset and emits keys in the documented order", () => {
    const text = serializeOhlc(sample);
    expect(parseOhlcDataset(JSON.parse(text))).toEqual(sample);
    expect(Object.keys(JSON.parse(text) as object)).toEqual([
      "version", "seed", "symbol", "dates", "open", "high", "low", "close",
    ]);
  });

  it("returns a copy without unknown fields", () => {
    const parsed = parseOhlcDataset({ ...sample, extra: true });
    expect(parsed).toEqual(sample);
    expect(parsed.open).not.toBe(sample.open);
  });

  it.each<[string, unknown, string]>([
    ["a non-object", [], "$"],
    ["a wrong version", { ...sample, version: 2 }, "version"],
    ["a non-finite seed", { ...sample, seed: "7" }, "seed"],
    ["a missing symbol", { ...sample, symbol: undefined }, "symbol"],
    ["an invalid date", { ...sample, dates: ["2026-01-02", "2026-13-01"] }, "dates[1]"],
    ["a column that is not an array", { ...sample, low: "99.4" }, "low"],
    ["a column length mismatch", { ...sample, high: [101.2] }, "high"],
    ["a non-finite value", { ...sample, close: [100.8, null] }, "close[1]"],
  ])("throws OhlcParseError for %s", (_label, input, path) => {
    expect(() => parseOhlcDataset(input)).toThrow(OhlcParseError);
    try {
      parseOhlcDataset(input);
    } catch (error) {
      expect((error as OhlcParseError).path).toBe(path);
    }
  });
});
