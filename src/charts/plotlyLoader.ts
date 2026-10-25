/**
 * Shared Plotly_Bundle loader (design.md › Charts › Plotly_Bundle; Req 15.5, 19.23, 30.10).
 *
 * The Live_Chart_Demo and the Journey_Chart both call `withTimeout(loadPlotly())`. Whichever
 * comes within 200 px of the viewport first triggers the only dynamic import of
 * `./plotly-bundle`; every later caller awaits the same memoized promise.
 *
 * Retry semantics (design.md › Error Handling › "Plotly retries"): the import is memoized
 * whether it fulfils or rejects, so the Plotly_Bundle is requested at most once per page
 * view. A rejected import is NOT retried in-page: every caller, earlier or later, receives
 * the same rejection and shows its section fallback (Req 15.7, 19.25). A page reload is the
 * retry path. `withTimeout` only rejects the caller's own wait; it never cancels or restarts
 * the shared import, so a late-arriving bundle is still delivered to subsequent callers.
 *
 * `./plotly-bundle` must only be reached through the dynamic `import()` below so it stays a
 * separate lazy chunk outside the Initial_Page_Weight (Req 30.2). Import only types from it.
 */
import type PlotlyDefault from "plotly.js";

export type { Config, Data, Layout, PlotlyHTMLElement } from "plotly.js";

/**
 * The Plotly surface the Live_Chart_Demo and the Journey_Chart use. Kept narrow so test
 * doubles stay small; widen it here (not at call sites) if a consumer needs more.
 */
export type PlotlyApi = Pick<typeof PlotlyDefault, "newPlot" | "react" | "relayout" | "purge">;

/** Starts the dynamic import of the Plotly_Bundle. Called at most once per loader. */
export type PlotlyImporter = () => Promise<{ default: PlotlyApi }>;

/** Req 15.7, 19.25: a consumer gives up waiting 15 s after its request. */
export const PLOTLY_TIMEOUT_MS = 15_000;

export interface PlotlyLoader {
  /** Memoized: the first call starts the import; every call returns the same promise. */
  load(): Promise<PlotlyApi>;
}

/** Builds an independent memoized loader. The app uses the default one via `loadPlotly`. */
export function createPlotlyLoader(importer: PlotlyImporter): PlotlyLoader {
  let pending: Promise<PlotlyApi> | null = null;
  return {
    load() {
      // Calling `importer().then` directly would let a synchronous throw escape; the
      // Promise constructor turns it into a memoized rejection like any import failure.
      pending ??= new Promise<{ default: PlotlyApi }>((resolve) => resolve(importer())).then((m) => m.default);
      return pending;
    },
  };
}

const defaultImporter: PlotlyImporter = () => {
  const browserGlobal = globalThis as typeof globalThis & { global?: typeof globalThis };
  browserGlobal.global ??= globalThis;
  return import("./plotly-bundle");
};

let defaultLoader = createPlotlyLoader(defaultImporter);

/** Loads the shared Plotly_Bundle, requesting it at most once per page view. */
export function loadPlotly(): Promise<PlotlyApi> {
  return defaultLoader.load();
}

/**
 * Test-only: forget the memoized default import so a test file can exercise `loadPlotly`
 * from a fresh state (with `./plotly-bundle` mocked). Never call this from app code.
 */
export function __resetPlotlyLoaderForTests(importer: PlotlyImporter = defaultImporter): void {
  defaultLoader = createPlotlyLoader(importer);
}

/** Rejection reason when a caller's wait exceeds its timeout. */
export class LoadTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Timed out after ${timeoutMs} ms`);
    this.name = "LoadTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Settles like `p`, or rejects with `LoadTimeoutError` if `p` has not settled within `ms`.
 * Only the returned promise is affected: `p` keeps running and is not re-requested. The
 * timer is cleared as soon as `p` settles.
 */
export function withTimeout<T>(p: Promise<T>, ms: number = PLOTLY_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new LoadTimeoutError(ms)), ms);
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        // Pass the shared rejection through unchanged so every caller sees the same reason.
        reject(error);
      },
    );
  });
}
