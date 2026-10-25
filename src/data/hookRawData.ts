import { liveDemo } from "./liveDemo";
import type { OhlcDataset } from "./types";
import { generateOhlc } from "../lib/ohlc";

export type RawDataIssueKind = "null" | "duplicate" | "format";

export interface RawDataCell<T extends string | number | null = string | number | null> {
  value: T;
  issue?: RawDataIssueKind;
}

export interface HookRawDataRow {
  id: string;
  date: RawDataCell<string>;
  ticker: RawDataCell<string>;
  open: RawDataCell<string | number>;
  high: RawDataCell<string | number | null>;
  low: RawDataCell<string | number>;
  close: RawDataCell<string | number | null>;
  volume: RawDataCell<string | number | null>;
}

const source: OhlcDataset = generateOhlc(liveDemo);

function sourceIndex(date: string): number {
  const index = source.dates.indexOf(date);
  if (index < 0) throw new Error(`Hook raw-data preview date ${date} is outside the sample dataset`);
  return index;
}

function sourceRow(date: string, id: string): HookRawDataRow {
  const index = sourceIndex(date);
  return {
    id,
    date: { value: date },
    ticker: { value: "ASH", issue: "format" },
    open: { value: source.open[index] },
    high: { value: source.high[index] },
    low: { value: source.low[index] },
    close: { value: source.close[index] },
    volume: { value: 250_000 + ((source.seed + index * 7_919) % 1_750_000) },
  };
}

const firstRow = sourceRow("2026-03-04", "row-1");

function duplicateRow(): HookRawDataRow {
  return {
    id: "row-2",
    date: { value: firstRow.date.value, issue: "duplicate" },
    ticker: { ...firstRow.ticker },
    open: { ...firstRow.open },
    high: { ...firstRow.high },
    low: { ...firstRow.low },
    close: { ...firstRow.close },
    volume: { ...firstRow.volume },
  };
}

const datedRow = (date: string, displayDate: string, id: string) => {
  const row = sourceRow(date, id);
  row.date = { value: displayDate, issue: "format" };
  return row;
};

const rawRows: HookRawDataRow[] = [
  firstRow,
  duplicateRow(),
  { ...datedRow("2026-03-05", "03/05/2026", "row-3"), ticker: { value: "ash", issue: "format" } },
  {
    ...datedRow("2026-03-06", "Mar 6 2026", "row-4"),
    close: { value: `$${source.close[sourceIndex("2026-03-06")].toFixed(1)}`, issue: "format" },
  },
  {
    ...sourceRow("2026-07-01", "row-5"),
    ticker: { value: "Ash", issue: "format" },
    close: { value: `$${source.close[sourceIndex("2026-07-01")].toFixed(1)}`, issue: "format" },
  },
  { ...sourceRow("2026-03-09", "row-6"), high: { value: "NULL", issue: "null" } },
  { ...sourceRow("2026-03-10", "row-7"), close: { value: null, issue: "null" } },
  sourceRow("2026-03-11", "row-8"),
];

export const hookRawData = {
  rows: rawRows,
  csv: [
    "date,ticker,open,high,low,close,volume",
    ...rawRows.flatMap((row, index) => {
      const values = [row.date, row.ticker, row.open, row.high, row.low, row.close, row.volume].map(
        ({ value }) => (value === null ? "" : String(value)),
      );
      const csvLine = values.map((value) => (value.includes(",") ? `"${value.replaceAll('"', '""')}"` : value)).join(",");
      return index === 1 ? [csvLine, ""] : [csvLine];
    }),
  ].join("\n"),
} as const;
