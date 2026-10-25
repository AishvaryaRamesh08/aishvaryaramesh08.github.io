/**
 * Plotly_Bundle: the Plotly.js partial bundle shared by the Live_Chart_Demo and the
 * Journey_Chart (design.md › Charts › Plotly_Bundle). Only scatter (part of core) and
 * candlestick are included. This module must only ever be reached through a dynamic
 * `import()` (via plotlyLoader.ts) so it stays out of the Initial_Page_Weight.
 *
 * Variant decision (task 1.5), measured with `npx tsx scripts/compare-plotly-bundles.ts`
 * on Vite 8.3.4, each variant built as its own dynamic-import chunk, gzip level 9:
 *
 *   A. plotly.js/lib/core + plotly.js/lib/candlestick (plotly.js 4.1.2)
 *      raw 1,114,712 B, gzip 377,319 B, 0 build warnings   <- chosen
 *   B. plotly.js-finance-dist-min 4.1.2
 *      raw 1,256,871 B, gzip 408,423 B, 0 build warnings
 *
 * Variant A is about 31 KB (7.6%) smaller gzipped and builds cleanly. A smoke check of
 * the built chunk confirmed it evaluates and registers exactly the `scatter` and
 * `candlestick` traces. plotly.js-finance-dist-min was removed from the dependencies.
 */
import Plotly from "plotly.js/lib/core";
import candlestick from "plotly.js/lib/candlestick";

Plotly.register([candlestick]);

export default Plotly;
