/**
 * Writes the Live_Chart_Demo's bundled dataset, public/data/ohlc-sample.json, from the fixed seed
 * and settings in src/data/liveDemo.ts (Req 15.1, 15.11). Generation is deterministic, so rerunning
 * it (it runs as `prebuild`) leaves the committed file unchanged unless liveDemo.ts changed.
 *
 * Usage: npm run generate:ohlc   (or: tsx scripts/generate-ohlc.ts)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { liveDemo } from "../src/data/liveDemo.ts";
import { generateOhlc, serializeOhlc } from "../src/lib/ohlc.ts";

const root = process.cwd();
const outPath = resolve(root, "public", liveDemo.datasetPath);

try {
  const json = serializeOhlc(generateOhlc(liveDemo));
  let previous: string | undefined;
  try {
    previous = readFileSync(outPath, "utf8");
  } catch {
    previous = undefined; // first run: the file does not exist yet
  }
  const label = relative(root, outPath);
  if (previous === json) {
    console.log(`generate-ohlc: ${label} is up to date (${liveDemo.tradingDays} rows, seed ${liveDemo.seed})`);
  } else {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, json);
    console.log(`generate-ohlc: wrote ${label} (${liveDemo.tradingDays} rows, ${Buffer.byteLength(json)} B, seed ${liveDemo.seed})`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
