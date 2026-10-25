import { describe, expect, it } from "vitest";
import { hookRawData } from "./hookRawData";
import { liveDemo } from "./liveDemo";
import { generateOhlc } from "../lib/ohlc";

describe("hook raw CSV preview", () => {
  it("uses OHLC values from the exact deterministic dataset plotted by Plotly", () => {
    const dataset = generateOhlc(liveDemo);
    const row = hookRawData.rows[0];
    const index = dataset.dates.indexOf("2026-03-04");

    expect(row).toMatchObject({
      date: { value: dataset.dates[index] },
      ticker: { value: "ASH" },
      open: { value: dataset.open[index] },
      high: { value: dataset.high[index] },
      low: { value: dataset.low[index] },
      close: { value: dataset.close[index] },
    });
  });

  it("includes malformed CSV values, an empty record, mixed tickers, and an exact duplicate", () => {
    const [first, duplicate, usDate, longDate, textPrice, nullHigh, nullClose] = hookRawData.rows;
    expect(duplicate.date.value).toBe(first.date.value);
    expect(duplicate.ticker.value).toBe(first.ticker.value);
    expect(duplicate.open.value).toBe(first.open.value);
    expect(duplicate.high.value).toBe(first.high.value);
    expect(duplicate.low.value).toBe(first.low.value);
    expect(duplicate.close.value).toBe(first.close.value);
    expect(duplicate.volume.value).toBe(first.volume.value);
    expect(duplicate.date.issue).toBe("duplicate");
    expect(usDate.date.value).toBe("03/05/2026");
    expect(usDate.ticker.value).toBe("ash");
    expect(longDate.date.value).toBe("Mar 6 2026");
    expect(longDate.close.value).toMatch(/^\$\d+\.\d$/);
    expect(textPrice.date.value).toBe("2026-07-01");
    expect(textPrice.ticker.value).toBe("Ash");
    expect(textPrice.close.value).toBe("$101.2");
    expect(textPrice.close.issue).toBe("format");
    expect(nullHigh.high.value).toBe("NULL");
    expect(nullClose.close.value).toBeNull();
    expect(hookRawData.rows).toHaveLength(8);
    expect(hookRawData.csv).toContain("date,ticker,open,high,low,close,volume");
    expect(hookRawData.csv).toContain("ASH");
    expect(hookRawData.csv).toContain("ash");
    expect(hookRawData.csv).toContain("Mar 6 2026");
    expect(hookRawData.csv).toContain("2026-07-01,Ash,");
    expect(hookRawData.csv).toContain("$101.2");
    expect(hookRawData.csv).toContain(",,");
    expect(hookRawData.csv).toContain(`${hookRawData.rows[0].date.value},ASH,`);
    expect(hookRawData.csv.split("\n")).toHaveLength(10);
    expect(hookRawData.csv.split("\n")[3]).toBe("");
  });
});
