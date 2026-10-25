// Feature: portfolio-website, Property 9: OHLC row invariant —
// for any seed and valid config, every generated row satisfies low ≤ open ≤ high and
// low ≤ close ≤ high, with all four values finite, positive and rounded to cents, column lengths
// equal to tradingDays, dates consecutive business days in ascending order, and the first open
// equal to startPrice rounded to cents.
// **Validates: Requirements 15.12**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { liveDemo } from "../data/liveDemo";
import { generateOhlc, type OhlcGeneratorConfig } from "./ohlc";

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" for dates between 1990 and 2100 (UTC). */
const arbStartDate = fc
  .date({ min: new Date(Date.UTC(1990, 0, 1)), max: new Date(Date.UTC(2100, 11, 31)), noInvalidDate: true })
  .map((d) => d.toISOString().slice(0, 10) as OhlcGeneratorConfig["startDate"]);

/** Valid generator configs, including extreme drift and volatility. */
const arbConfig: fc.Arbitrary<OhlcGeneratorConfig> = fc.record({
  seed: fc.oneof(fc.integer(), fc.integer({ min: 0, max: 0xffffffff }), fc.double({ noNaN: true, noDefaultInfinity: true })),
  symbol: fc.stringMatching(/^[A-Z]{1,6}$/),
  startDate: arbStartDate,
  tradingDays: fc.integer({ min: 0, max: 40 }),
  startPrice: fc.oneof(
    fc.double({ min: 0.001, max: 10_000, noNaN: true }),
    fc.constantFrom(0.001, 0.005, 0.01, 1, 100),
  ),
  drift: fc.oneof(fc.double({ min: -0.05, max: 0.05, noNaN: true }), fc.double({ min: -5, max: 2, noNaN: true })),
  volatility: fc.oneof(
    fc.double({ min: 0, max: 0.1, noNaN: true }),
    fc.double({ min: 0, max: 3, noNaN: true }),
    fc.constant(0),
  ),
});

/** True when `x` is a whole number of cents (relative tolerance covers binary-float representation). */
function isCents(x: number): boolean {
  const scaled = x * 100;
  return Math.abs(scaled - Math.round(scaled)) <= 1e-9 * Math.max(1, Math.abs(scaled));
}

const utcMs = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const weekday = (ms: number): number => new Date(ms).getUTCDay();

/** The first business day on or after `iso`. */
function firstBusinessDay(iso: string): string {
  let ms = utcMs(iso);
  while (weekday(ms) === 0 || weekday(ms) === 6) ms += DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

function assertRowInvariant(cfg: OhlcGeneratorConfig): void {
  const d = generateOhlc(cfg);
  const n = cfg.tradingDays;

  expect(d.dates).toHaveLength(n);
  expect(d.open).toHaveLength(n);
  expect(d.high).toHaveLength(n);
  expect(d.low).toHaveLength(n);
  expect(d.close).toHaveLength(n);

  for (let i = 0; i < n; i++) {
    const row = { i, open: d.open[i], high: d.high[i], low: d.low[i], close: d.close[i] };
    for (const v of [row.open, row.high, row.low, row.close]) {
      expect(Number.isFinite(v), `non-finite value in ${JSON.stringify(row)}`).toBe(true);
      expect(v, `non-positive value in ${JSON.stringify(row)}`).toBeGreaterThan(0);
      expect(isCents(v), `value not rounded to cents in ${JSON.stringify(row)}`).toBe(true);
    }
    expect(row.low, JSON.stringify(row)).toBeLessThanOrEqual(Math.min(row.open, row.close));
    expect(Math.min(row.open, row.close)).toBeLessThanOrEqual(Math.max(row.open, row.close));
    expect(Math.max(row.open, row.close), JSON.stringify(row)).toBeLessThanOrEqual(row.high);
  }

  if (n > 0) {
    expect(d.open[0]).toBe(Math.max(0.01, Math.round(cfg.startPrice * 100) / 100));
    expect(d.dates[0]).toBe(firstBusinessDay(cfg.startDate));
  }

  for (let i = 0; i < n; i++) {
    expect(d.dates[i]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const ms = utcMs(d.dates[i]);
    const day = weekday(ms);
    expect(day >= 1 && day <= 5, `${d.dates[i]} is not Mon–Fri`).toBe(true);
    if (i > 0) {
      // Consecutive business days: next calendar day, or Friday → Monday.
      const prev = utcMs(d.dates[i - 1]);
      const expectedGap = weekday(prev) === 5 ? 3 * DAY_MS : DAY_MS;
      expect(ms - prev, `${d.dates[i - 1]} → ${d.dates[i]}`).toBe(expectedGap);
    }
  }
}

describe("Property 9: OHLC row invariant", () => {
  it("holds for arbitrary valid configs, including extreme drift and volatility", () => {
    fc.assert(fc.property(arbConfig, (cfg) => assertRowInvariant(cfg)));
  });

  it("holds for the real Live_Chart_Demo config under arbitrary seeds", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => assertRowInvariant({ ...liveDemo, seed })));
  });
});
