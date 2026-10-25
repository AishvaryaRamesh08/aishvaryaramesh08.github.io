// Seeded OHLC generator and the bundled dataset's JSON format (design "Seeded OHLC generator",
// Req 15.1, 15.9, 15.11, 15.12). Pure and deterministic: no Date.now, no Math.random.
//
// Determinism note: the generator uses only IEEE-754 basic arithmetic (+, −, ×, ÷, Math.round,
// Math.abs, Math.max/min) on top of mulberry32. Normal variates come from the Irwin–Hall
// approximation (sum of 12 uniforms − 6) instead of Box–Muller, because Math.log/Math.cos are
// implementation-approximated and could differ in the last bit across engines; the bundled JSON
// must be reproducible on any Node version (Req 15.11).
import type { LiveDemoConfig, OhlcDataset } from "../data/types";
import { mulberry32, type Rng } from "./random";

export { mulberry32, type Rng };

/** The config fields the generator reads (`LiveDemoConfig` satisfies this). */
export type OhlcGeneratorConfig = Pick<
  LiveDemoConfig,
  "seed" | "symbol" | "startDate" | "tradingDays" | "startPrice" | "drift" | "volatility"
>;

/** Overnight gap scale relative to the daily volatility. */
const GAP_SCALE = 0.25;
/** Wick length scale relative to the daily volatility. */
const WICK_SCALE = 0.5;
/** Lower bound for a multiplicative step, keeping raw prices positive for any volatility. */
const MIN_FACTOR = 0.01;
/** Upper bound for the fraction a low wick may extend below the body. */
const MAX_LOW_WICK = 0.99;
/** Smallest price after rounding: one cent. */
const MIN_PRICE = 0.01;

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Standard-normal approximation (Irwin–Hall, n = 12): mean 0, variance 1, range [−6, 6). */
function normal(rng: Rng): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += rng();
  return sum - 6;
}

/**
 * Rounds to cents with a one-cent floor. Both steps are monotonic non-decreasing, so any ordering
 * between raw values (low ≤ min(open, close), max(open, close) ≤ high) survives (Req 15.12).
 */
function toCents(value: number): number {
  return Math.max(MIN_PRICE, Math.round(value * 100) / 100);
}

/** UTC milliseconds of a valid "YYYY-MM-DD" calendar date, or undefined. */
function parseIsoDate(value: string): number | undefined {
  const m = ISO_DATE.exec(value);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const date = new Date(ms);
  // Date.UTC treats years 0–99 as 1900–1999; setUTCFullYear keeps the literal year.
  date.setUTCFullYear(y);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return undefined;
  return date.getTime();
}

function formatIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function isWeekend(ms: number): boolean {
  const day = new Date(ms).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * `count` consecutive business days (Mon–Fri, no holiday calendar) starting at `startDate`, or at
 * the next weekday when `startDate` falls on a weekend.
 */
export function businessDays(startDate: string, count: number): string[] {
  const start = parseIsoDate(startDate);
  if (start === undefined) throw new RangeError(`startDate must be a valid YYYY-MM-DD date, got "${startDate}"`);
  const dates: string[] = [];
  for (let ms = start; dates.length < count; ms += DAY_MS) {
    if (!isWeekend(ms)) dates.push(formatIsoDate(ms));
  }
  return dates;
}

function assertConfig(cfg: OhlcGeneratorConfig): void {
  if (!Number.isFinite(cfg.seed)) throw new RangeError(`seed must be a finite number, got ${cfg.seed}`);
  if (!Number.isInteger(cfg.tradingDays) || cfg.tradingDays < 0) {
    throw new RangeError(`tradingDays must be a non-negative integer, got ${cfg.tradingDays}`);
  }
  if (!(Number.isFinite(cfg.startPrice) && cfg.startPrice > 0)) {
    throw new RangeError(`startPrice must be a positive finite number, got ${cfg.startPrice}`);
  }
  if (!Number.isFinite(cfg.drift)) throw new RangeError(`drift must be a finite number, got ${cfg.drift}`);
  if (!(Number.isFinite(cfg.volatility) && cfg.volatility >= 0)) {
    throw new RangeError(`volatility must be a non-negative finite number, got ${cfg.volatility}`);
  }
}

/**
 * Geometric random walk over business days (design "Seeded OHLC generator"):
 * `open = prevClose × (1 + gap)`, `close = open × (1 + drift + vol × z)`,
 * `high = max(open, close) × (1 + |n1|)`, `low = min(open, close) × (1 − |n2|)`, all rounded to
 * cents. The first open is `startPrice`. The same config always yields the same dataset (Req 15.11),
 * and every row satisfies `low ≤ min(open, close) ≤ max(open, close) ≤ high` with positive values
 * (Req 15.12). Throws `RangeError` for an invalid config.
 */
export function generateOhlc(cfg: OhlcGeneratorConfig): OhlcDataset {
  assertConfig(cfg);
  const rng = mulberry32(cfg.seed);
  const dates = businessDays(cfg.startDate, cfg.tradingDays);
  const open: number[] = [];
  const high: number[] = [];
  const low: number[] = [];
  const close: number[] = [];
  const vol = cfg.volatility;
  let prevClose = cfg.startPrice;

  for (let i = 0; i < dates.length; i++) {
    const gap = i === 0 ? 0 : vol * GAP_SCALE * normal(rng);
    const rawOpen = prevClose * Math.max(MIN_FACTOR, 1 + gap);
    const rawClose = rawOpen * Math.max(MIN_FACTOR, 1 + cfg.drift + vol * normal(rng));
    const upWick = vol * WICK_SCALE * Math.abs(normal(rng));
    const downWick = Math.min(MAX_LOW_WICK, vol * WICK_SCALE * Math.abs(normal(rng)));
    const rawHigh = Math.max(rawOpen, rawClose) * (1 + upWick);
    const rawLow = Math.min(rawOpen, rawClose) * (1 - downWick);

    open.push(toCents(rawOpen));
    close.push(toCents(rawClose));
    high.push(toCents(rawHigh));
    low.push(toCents(rawLow));
    // Continue from the displayed (rounded) close so gaps match what the chart shows.
    prevClose = close[i];
  }

  return { version: 1, seed: cfg.seed, symbol: cfg.symbol, dates, open, high, low, close };
}

/**
 * Serializes a dataset to the bundled JSON format: one top-level key per line in the fixed order
 * `version, seed, symbol, dates, open, high, low, close`, each column on a single line, trailing
 * newline. Valid JSON; `parseOhlcDataset(JSON.parse(serializeOhlc(d)))` deep-equals `d` (Req 15.9).
 */
export function serializeOhlc(d: OhlcDataset): string {
  const fields: [keyof OhlcDataset, unknown][] = [
    ["version", d.version],
    ["seed", d.seed],
    ["symbol", d.symbol],
    ["dates", d.dates],
    ["open", d.open],
    ["high", d.high],
    ["low", d.low],
    ["close", d.close],
  ];
  const lines = fields.map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
  return `{\n${lines.join(",\n")}\n}\n`;
}

/** Thrown by `parseOhlcDataset`; `path` names the offending field (e.g. "high[3]"). */
export class OhlcParseError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`Invalid OHLC dataset at ${path}: ${message}`);
    this.name = "OhlcParseError";
    this.path = path;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function parseNumberColumn(obj: Record<string, unknown>, key: "open" | "high" | "low" | "close", length: number): number[] {
  const col = obj[key];
  if (!Array.isArray(col)) throw new OhlcParseError(key, "expected an array");
  if (col.length !== length) throw new OhlcParseError(key, `expected ${length} values to match dates, got ${col.length}`);
  return col.map((v: unknown, i) => {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new OhlcParseError(`${key}[${i}]`, "expected a finite number");
    return v;
  });
}

/**
 * Validates parsed JSON (e.g. `await res.json()`) as an `OhlcDataset` and returns a fresh copy
 * holding only the known fields. Accepted shape: an object with `version === 1`, a finite numeric
 * `seed`, a string `symbol`, `dates` as valid "YYYY-MM-DD" strings, and `open`/`high`/`low`/`close`
 * as arrays of finite numbers with the same length as `dates`. Anything else throws
 * `OhlcParseError` naming the offending field. Row-level price ordering is not checked here; it is
 * a property of the generator (Req 15.12).
 */
export function parseOhlcDataset(json: unknown): OhlcDataset {
  if (!isRecord(json)) throw new OhlcParseError("$", "expected an object");
  if (json.version !== 1) throw new OhlcParseError("version", `expected 1, got ${JSON.stringify(json.version)}`);
  if (typeof json.seed !== "number" || !Number.isFinite(json.seed)) {
    throw new OhlcParseError("seed", "expected a finite number");
  }
  if (typeof json.symbol !== "string") throw new OhlcParseError("symbol", "expected a string");
  if (!Array.isArray(json.dates)) throw new OhlcParseError("dates", "expected an array");
  const dates = json.dates.map((v: unknown, i) => {
    if (typeof v !== "string" || parseIsoDate(v) === undefined) {
      throw new OhlcParseError(`dates[${i}]`, "expected a YYYY-MM-DD date string");
    }
    return v;
  });
  const n = dates.length;
  return {
    version: 1,
    seed: json.seed,
    symbol: json.symbol,
    dates,
    open: parseNumberColumn(json, "open", n),
    high: parseNumberColumn(json, "high", n),
    low: parseNumberColumn(json, "low", n),
    close: parseNumberColumn(json, "close", n),
  };
}
