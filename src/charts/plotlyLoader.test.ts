// Example tests for the shared Plotly loader. The "requested at most once" property across
// arbitrary interleavings is property-tested in task 17.2 (Property 10).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetPlotlyLoaderForTests,
  createPlotlyLoader,
  loadPlotly,
  LoadTimeoutError,
  PLOTLY_TIMEOUT_MS,
  withTimeout,
  type PlotlyApi,
  type PlotlyImporter,
} from "./plotlyLoader";

// The real bundle is ~1 MB of Plotly; the default loader is exercised against this stand-in.
vi.mock("./plotly-bundle", () => ({ default: { tag: "mocked-bundle" } }));

const fakePlotly = (): PlotlyApi =>
  ({ newPlot: vi.fn(), react: vi.fn(), relayout: vi.fn(), purge: vi.fn() }) as unknown as PlotlyApi;

/** An importer whose settlement the test controls, counting how often it is called. */
function deferredImporter() {
  let resolve!: (m: { default: PlotlyApi }) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<{ default: PlotlyApi }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const importer = vi.fn<PlotlyImporter>(() => promise);
  return { importer, resolve, reject };
}

afterEach(() => {
  vi.useRealTimers();
  __resetPlotlyLoaderForTests();
});

describe("createPlotlyLoader", () => {
  it("does not import until the first load()", () => {
    const { importer } = deferredImporter();
    createPlotlyLoader(importer);
    expect(importer).not.toHaveBeenCalled();
  });

  it("concurrent and sequential callers share one import and one module instance", async () => {
    const { importer, resolve } = deferredImporter();
    const loader = createPlotlyLoader(importer);
    const liveDemo = loader.load();
    const journey = loader.load();
    expect(journey).toBe(liveDemo);
    const plotly = fakePlotly();
    resolve({ default: plotly });
    await expect(liveDemo).resolves.toBe(plotly);
    await expect(loader.load()).resolves.toBe(plotly);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("memoizes a rejected import: later callers get the same rejection and no retry", async () => {
    const { importer, reject } = deferredImporter();
    const loader = createPlotlyLoader(importer);
    const first = loader.load();
    const failure = new Error("chunk failed");
    reject(failure);
    await expect(first).rejects.toBe(failure);
    await expect(loader.load()).rejects.toBe(failure);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("memoizes a synchronous importer throw as a rejection", async () => {
    const failure = new Error("sync");
    const importer = vi.fn<PlotlyImporter>(() => {
      throw failure;
    });
    const loader = createPlotlyLoader(importer);
    await expect(loader.load()).rejects.toBe(failure);
    await expect(loader.load()).rejects.toBe(failure);
    expect(importer).toHaveBeenCalledTimes(1);
  });
});

describe("withTimeout", () => {
  it("rejects only the caller's wait after the timeout; the shared import is not restarted", async () => {
    vi.useFakeTimers();
    const { importer, resolve } = deferredImporter();
    const loader = createPlotlyLoader(importer);

    const timedOut = withTimeout(loader.load());
    const settled = expect(timedOut).rejects.toBeInstanceOf(LoadTimeoutError);
    await vi.advanceTimersByTimeAsync(PLOTLY_TIMEOUT_MS);
    await settled;

    // A later consumer (e.g. the other chart) still awaits the same in-flight import.
    const later = withTimeout(loader.load());
    const plotly = fakePlotly();
    resolve({ default: plotly });
    await expect(later).resolves.toBe(plotly);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("does not reject at 1 ms before the timeout and clears its timer once settled", async () => {
    vi.useFakeTimers();
    let resolve!: (v: string) => void;
    const p = new Promise<string>((res) => (resolve = res));
    const waited = withTimeout(p, 1_000);
    await vi.advanceTimersByTimeAsync(999);
    resolve("ok");
    await expect(waited).resolves.toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("passes the underlying rejection through unchanged", async () => {
    const failure = new Error("boom");
    await expect(withTimeout(Promise.reject(failure))).rejects.toBe(failure);
  });

  it("defaults to 15 s", () => {
    expect(PLOTLY_TIMEOUT_MS).toBe(15_000);
    expect(new LoadTimeoutError(PLOTLY_TIMEOUT_MS).timeoutMs).toBe(15_000);
  });
});

describe("loadPlotly (default loader)", () => {
  it("imports ./plotly-bundle once and returns its default export to every caller", async () => {
    const a = loadPlotly();
    const b = loadPlotly();
    expect(b).toBe(a);
    await expect(a).resolves.toEqual({ tag: "mocked-bundle" });
  });

  it("__resetPlotlyLoaderForTests installs a fresh loader with an injected importer", async () => {
    const plotly = fakePlotly();
    const importer = vi.fn<PlotlyImporter>(() => Promise.resolve({ default: plotly }));
    __resetPlotlyLoaderForTests(importer);
    await expect(Promise.all([loadPlotly(), loadPlotly()])).resolves.toEqual([plotly, plotly]);
    expect(importer).toHaveBeenCalledTimes(1);
  });
});
