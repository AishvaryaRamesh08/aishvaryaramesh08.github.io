/**
 * Compare the two Plotly_Bundle candidates (design.md › Charts › Plotly_Bundle):
 *
 *   A. `plotly.js/lib/core` + `plotly.js/lib/candlestick`, registered with `Plotly.register`
 *   B. the prebuilt `plotly.js-finance-dist-min`
 *
 * Each variant is built with Vite's JS API from a throwaway entry whose only job is to
 * `import()` the variant, so the variant lands in its own dynamic-import chunk exactly as
 * it will in the app. The script prints the raw and gzip (level 9) size of every chunk that
 * belongs to the dynamic import, plus any build warnings, and recommends the smaller variant
 * that built cleanly.
 *
 * It uses an inline config (`configFile: false`) and a temporary directory under the project
 * root, so it never reads or touches `vite.config.ts` or `dist/`. Temporary files are removed
 * when the script finishes.
 *
 * Usage: npx tsx scripts/compare-plotly-bundles.ts
 * The packages under comparison must be installed for their variant to build. After the
 * task 1.5 decision only variant A's package (plotly.js) is a dependency; to re-run the
 * comparison, temporarily `npm install --no-save plotly.js-finance-dist-min@<same major>`.
 * The measured results are recorded at the top of src/charts/plotly-bundle.ts.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build, createLogger, type Rollup } from "vite";

type Variant = { id: "A" | "B"; label: string; source: string };

type ChunkSize = { file: string; raw: number; gzip: number };

type Result =
  | { variant: Variant; ok: true; chunks: ChunkSize[]; raw: number; gzip: number; warnings: string[] }
  | { variant: Variant; ok: false; error: string; warnings: string[] };

const VARIANTS: readonly Variant[] = [
  {
    id: "A",
    label: "plotly.js/lib/core + plotly.js/lib/candlestick",
    source: [
      'import Plotly from "plotly.js/lib/core";',
      'import candlestick from "plotly.js/lib/candlestick";',
      "Plotly.register([candlestick]);",
      "export default Plotly;",
      "",
    ].join("\n"),
  },
  {
    id: "B",
    label: "plotly.js-finance-dist-min",
    source: ['import Plotly from "plotly.js-finance-dist-min";', "export default Plotly;", ""].join("\n"),
  },
];

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tmpRoot = join(projectRoot, ".tmp-plotly-compare");

function isOutputArray(out: unknown): out is Rollup.RollupOutput[] {
  return Array.isArray(out);
}

async function buildVariant(variant: Variant): Promise<Result> {
  const dir = join(tmpRoot, variant.id);
  const outDir = join(dir, "out");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "plotly-bundle.js"), variant.source);
  // The entry only references the variant through a dynamic import, as plotlyLoader.ts will.
  writeFileSync(join(dir, "entry.js"), 'export const loadPlotly = () => import("./plotly-bundle.js");\n');

  const warnings: string[] = [];
  const logger = createLogger("warn", { allowClearScreen: false });
  const baseWarn = logger.warn.bind(logger);
  logger.warn = (msg, opts) => {
    warnings.push(msg);
    baseWarn(msg, opts);
  };

  try {
    const out = await build({
      configFile: false,
      root: dir,
      logLevel: "warn",
      customLogger: logger,
      build: {
        outDir,
        emptyOutDir: true,
        write: true,
        minify: true,
        reportCompressedSize: false,
        chunkSizeWarningLimit: 100_000,
        rollupOptions: {
          input: join(dir, "entry.js"),
          output: { format: "es", entryFileNames: "entry.js", chunkFileNames: "[name]-[hash].js" },
          preserveEntrySignatures: "exports-only",
        },
      },
    });
    const outputs = isOutputArray(out) ? out : [out as Rollup.RollupOutput];
    const chunks: ChunkSize[] = [];
    for (const o of outputs) {
      for (const item of o.output) {
        // Everything except the tiny entry belongs to the dynamic Plotly chunk (and its deps).
        if (item.type !== "chunk" || item.isEntry) continue;
        const bytes = readFileSync(join(outDir, item.fileName));
        chunks.push({ file: item.fileName, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length });
      }
    }
    if (chunks.length === 0) throw new Error("no dynamic-import chunk was emitted");
    const raw = chunks.reduce((s, c) => s + c.raw, 0);
    const gzip = chunks.reduce((s, c) => s + c.gzip, 0);
    return { variant, ok: true, chunks, raw, gzip, warnings };
  } catch (err) {
    return { variant, ok: false, error: err instanceof Error ? err.message : String(err), warnings };
  }
}

const fmt = (n: number) => `${n.toLocaleString("en-US")} B (${(n / 1024).toFixed(1)} KiB)`;

async function main(): Promise<number> {
  const results: Result[] = [];
  try {
    for (const v of VARIANTS) results.push(await buildVariant(v));
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log("\nPlotly_Bundle comparison (gzip level 9)\n");
  for (const r of results) {
    console.log(`Variant ${r.variant.id}: ${r.variant.label}`);
    if (!r.ok) {
      console.log(`  BUILD FAILED: ${r.error}`);
    } else {
      for (const c of r.chunks) console.log(`  ${c.file}: raw ${fmt(c.raw)}, gzip ${fmt(c.gzip)}`);
      console.log(`  total: raw ${fmt(r.raw)}, gzip ${fmt(r.gzip)}`);
    }
    console.log(`  build warnings: ${r.warnings.length}`);
    console.log("");
  }

  const clean = results.filter((r): r is Extract<Result, { ok: true }> => r.ok && r.warnings.length === 0);
  const built = results.filter((r): r is Extract<Result, { ok: true }> => r.ok);
  const pool = clean.length > 0 ? clean : built;
  if (pool.length === 0) {
    console.error("No variant built successfully.");
    return 1;
  }
  const winner = pool.reduce((a, b) => (b.gzip < a.gzip ? b : a));
  console.log(
    `Smallest ${clean.length > 0 ? "clean " : ""}build: variant ${winner.variant.id} ` +
      `(${winner.variant.label}), gzip ${fmt(winner.gzip)}`,
  );
  return 0;
}

process.exitCode = await main();
