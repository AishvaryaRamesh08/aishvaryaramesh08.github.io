// plotly.js 4 ships types only for its full entry point (`plotly.js` → lib/index.d.ts).
// The partial-bundle entry points used by plotly-bundle.ts have the same runtime shape,
// so they reuse those types.
declare module "plotly.js/lib/core" {
  import Plotly from "plotly.js";
  export default Plotly;
}

declare module "plotly.js/lib/candlestick" {
  import type { PlotlyModule } from "plotly.js";
  const candlestick: PlotlyModule;
  export default candlestick;
}
