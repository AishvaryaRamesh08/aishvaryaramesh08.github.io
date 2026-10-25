// Feature: portfolio-website, Property 10: Plotly_Bundle requested at most once —
// for any interleaving of load() calls from the Live_Chart_Demo, the Journey_Chart and further
// consumers (including calls after a consumer-side timeout), the underlying dynamic import runs
// at most once (exactly once if anyone asked), and every caller receives the same module
// instance or the same rejection; withTimeout only ends the caller's own wait.
// **Validates: Requirements 15.5, 19.23, 30.10**
import fc from "fast-check";
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

// Keep the real ~1 MB bundle out of the test run; the default loader is always reset to a
// counting importer below, so this stand-in is never actually used.
vi.mock("./plotly-bundle", () => ({ default: { tag: "mocked-bundle" } }));

const CONSUMERS = ["Live_Chart_Demo", "Journey_Chart", "Consumer_3", "Consumer_4", "Consumer_5"];

type Action =
  | { type: "load"; consumer: number }
  | { type: "loadWithTimeout"; consumer: number; ms: number | undefined }
  | { type: "advance"; ms: number }
  | { type: "settle" };

/** Durations clustered around the interesting range (short waits and the 15 s default). */
const arbMs = fc.oneof(
  fc.integer({ min: 1, max: 50 }),
  fc.integer({ min: 1, max: 20_000 }),
  fc.integer({ min: PLOTLY_TIMEOUT_MS - 2, max: PLOTLY_TIMEOUT_MS + 2 }),
);

const arbAction = (consumerCount: number): fc.Arbitrary<Action> => {
  const consumer = fc.integer({ min: 0, max: consumerCount - 1 });
  return fc.oneof(
    consumer.map((c): Action => ({ type: "load", consumer: c })),
    fc
      .tuple(consumer, fc.option(arbMs, { nil: undefined }))
      .map(([c, ms]): Action => ({ type: "loadWithTimeout", consumer: c, ms })),
    fc.oneof(fc.constant(0), arbMs).map((ms): Action => ({ type: "advance", ms })),
    fc.constant<Action>({ type: "settle" }),
  );
};

const arbScenario = fc.integer({ min: 1, max: CONSUMERS.length }).chain((consumerCount) =>
  fc.record({
    consumerCount: fc.constant(consumerCount),
    actions: fc.array(arbAction(consumerCount), { maxLength: 30 }),
    outcome: fc.constantFrom("resolve" as const, "reject" as const),
    useDefaultLoader: fc.boolean(),
  }),
);

interface Wait {
  consumer: string;
  start: number;
  /** null for a bare load(); otherwise the effective timeout. */
  timeoutMs: number | null;
  result?: { kind: "ok"; value: unknown } | { kind: "err"; error: unknown };
}

/** Lets promise chains (import → loader → withTimeout) settle without touching the clock. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
  __resetPlotlyLoaderForTests();
});

describe("Property 10: Plotly_Bundle requested at most once", () => {
  it("one import per page view; every caller gets the same module or the same rejection", async () => {
    await fc.assert(
      fc.asyncProperty(arbScenario, async ({ consumerCount, actions, outcome, useDefaultLoader }) => {
        vi.useFakeTimers();
        try {
          // Fresh, unique module instance and rejection reason per run so identity checks are exact.
          const plotly = { tag: "plotly-instance" } as unknown as PlotlyApi;
          const failure = new Error("chunk failed to load");

          let resolveImport!: (m: { default: PlotlyApi }) => void;
          let rejectImport!: (e: unknown) => void;
          const importPromise = new Promise<{ default: PlotlyApi }>((res, rej) => {
            resolveImport = res;
            rejectImport = rej;
          });
          const importer = vi.fn<PlotlyImporter>(() => importPromise);

          let load: () => Promise<PlotlyApi>;
          if (useDefaultLoader) {
            __resetPlotlyLoaderForTests(importer);
            load = loadPlotly;
          } else {
            const loader = createPlotlyLoader(importer);
            load = () => loader.load();
          }

          let now = 0;
          let settledAt: number | null = null;
          let anyLoad = false;
          const waits: Wait[] = [];
          const loadPromises: Promise<PlotlyApi>[] = [];

          const startWait = (consumer: number, withTimer: boolean, ms?: number) => {
            anyLoad = true;
            const p = load();
            loadPromises.push(p);
            const wait: Wait = {
              consumer: CONSUMERS[consumer],
              start: now,
              timeoutMs: withTimer ? (ms ?? PLOTLY_TIMEOUT_MS) : null,
            };
            const observed = withTimer ? (ms === undefined ? withTimeout(p) : withTimeout(p, ms)) : p;
            observed.then(
              (value) => (wait.result = { kind: "ok", value }),
              (error: unknown) => (wait.result = { kind: "err", error }),
            );
            waits.push(wait);
          };

          // Settling only makes sense once the import has actually been requested.
          const settleIfPending = () => {
            if (importer.mock.calls.length === 0 || settledAt !== null) return;
            settledAt = now;
            if (outcome === "resolve") resolveImport({ default: plotly });
            else rejectImport(failure);
          };

          const checkInvariants = () => {
            expect(importer.mock.calls.length).toBeLessThanOrEqual(1);
            for (const p of loadPromises) expect(p).toBe(loadPromises[0]);
          };

          for (const action of actions) {
            switch (action.type) {
              case "load":
                startWait(action.consumer, false);
                break;
              case "loadWithTimeout":
                startWait(action.consumer, true, action.ms);
                break;
              case "advance":
                await vi.advanceTimersByTimeAsync(action.ms);
                now += action.ms;
                break;
              case "settle":
                settleIfPending();
                break;
            }
            await flushMicrotasks();
            checkInvariants();
          }

          // Nobody asked → nothing requested; anybody asked (even only via timeouts) → exactly one.
          expect(importer).toHaveBeenCalledTimes(anyLoad ? 1 : 0);

          // Late callers: one round before and one after settlement, then let every timer run out.
          const lateRound = () => {
            for (let c = 0; c < consumerCount; c++) {
              startWait(c, false);
              startWait(c, true);
            }
          };
          lateRound();
          await flushMicrotasks();
          settleIfPending();
          await flushMicrotasks();
          lateRound();
          await flushMicrotasks();
          await vi.advanceTimersByTimeAsync(PLOTLY_TIMEOUT_MS + 25_000);
          await flushMicrotasks();
          checkInvariants();

          // Timeouts never trigger a second import.
          expect(importer).toHaveBeenCalledTimes(1);
          expect(settledAt).not.toBeNull();
          const settled = settledAt as unknown as number;

          for (const wait of waits) {
            expect(wait.result, `${wait.consumer} wait never settled`).toBeDefined();
            const timedOut = wait.timeoutMs !== null && settled >= wait.start + wait.timeoutMs;
            if (timedOut) {
              expect(wait.result?.kind).toBe("err");
              const error = wait.result?.kind === "err" ? wait.result.error : undefined;
              expect(error).toBeInstanceOf(LoadTimeoutError);
              expect((error as LoadTimeoutError).timeoutMs).toBe(wait.timeoutMs);
            } else if (outcome === "resolve") {
              expect(wait.result?.kind).toBe("ok");
              expect(wait.result?.kind === "ok" && wait.result.value).toBe(plotly);
            } else {
              expect(wait.result?.kind).toBe("err");
              expect(wait.result?.kind === "err" && wait.result.error).toBe(failure);
            }
          }
        } finally {
          vi.useRealTimers();
        }
      }),
    );
  });
});
