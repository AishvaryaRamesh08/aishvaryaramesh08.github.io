// Unit tests for the Background_Layer canvas engine (Req 5.2, 6.4–6.6, 6.10, 6.11, 6.14, 6.15).
// jsdom has no real 2D context, so we install a recording fake context and drive the loop with a
// controllable rAF. We assert the engine:
//   - pauses when the tab is hidden (the clock does not advance) and resumes without catching up,
//   - draws a single static frame under reduced motion and stops its loop,
//   - re-reads the palette and redraws on a Theme change,
//   - swaps scenes via setScene, fades the Neural_Layer via revealNeural,
//   - cleans up its timers, listeners and rAF on destroy,
//   - returns null when no 2D context is available, and
//   - blanks the layer (via onError) when drawing throws, without itself throwing.
//
// The motion/theme stores keep module-level state, so each test re-imports them (and the engine)
// fresh after `vi.resetModules()` to avoid a cached matchMedia listener leaking across tests.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { background } from "../../data/background";

/** A recording 2D context: every draw call is captured so a test can assert what was drawn. */
interface FakeContext {
  calls: string[];
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;
  globalAlpha: number;
  lineDashOffset: number;
  shouldThrow: boolean;
}

function createFakeContext(): CanvasRenderingContext2D & FakeContext {
  const ctx = {
    calls: [] as string[],
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    lineDashOffset: 0,
    shouldThrow: false,
    setTransform: vi.fn(),
    // clearRect is used both by draw() and by clear() on destroy; it never throws so that the
    // post-error cleanup path stays clean. Draw failures are simulated via beginPath below.
    clearRect(this: FakeContext) {
      this.calls.push("clearRect");
    },
    beginPath(this: FakeContext) {
      if (this.shouldThrow) throw new Error("draw failed");
      this.calls.push("beginPath");
    },
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc(this: FakeContext) {
      this.calls.push("arc");
    },
    stroke(this: FakeContext) {
      this.calls.push("stroke");
    },
    fill(this: FakeContext) {
      this.calls.push("fill");
    },
    setLineDash: vi.fn(),
  };
  return ctx as unknown as CanvasRenderingContext2D & FakeContext;
}

/** A canvas whose getContext returns our fake, with a non-zero client box. */
function createCanvas(ctx: CanvasRenderingContext2D | null): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  vi.spyOn(canvas, "getContext").mockReturnValue(ctx as never);
  vi.spyOn(canvas, "clientWidth", "get").mockReturnValue(1000);
  vi.spyOn(canvas, "clientHeight", "get").mockReturnValue(800);
  return canvas;
}

/** matchMedia mock for the reduced-motion query; `reduced` controls the current preference. */
function stubMatchMedia(reduced: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(
      (query: string): MediaQueryList =>
        ({
          media: query,
          matches: query === "(prefers-reduced-motion: reduce)" && reduced,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          onchange: null,
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    ),
  );
}

/** Sets `document.visibilityState`; returns the spy so a test can flip it. */
function stubVisibility(state: DocumentVisibilityState) {
  return vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);
}

let rafCallbacks: FrameRequestCallback[] = [];
let rafId = 0;

/** Fresh engine + scene modules per test, so the motion/theme stores start clean. */
async function loadEngine() {
  const [{ createCanvasEngine }, sceneModule, themeStore] = await Promise.all([
    import("./canvasEngine"),
    import("../scene"),
    import("../../hooks/themeStore"),
  ]);
  const scene = sceneModule.buildScene(background.seed, "desktop", background);
  return { createCanvasEngine, scene, buildScene: sceneModule.buildScene, themeStore };
}

const clearRects = (ctx: FakeContext) => ctx.calls.filter((c) => c === "clearRect").length;

beforeEach(() => {
  vi.resetModules();
  rafCallbacks = [];
  rafId = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return ++rafId;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.className = "";
});

/** Runs every queued rAF frame at timestamp `now`. */
function flushFrame(now: number): void {
  const callbacks = rafCallbacks;
  rafCallbacks = [];
  for (const cb of callbacks) cb(now);
}

describe("createCanvasEngine", () => {
  it("returns null when no 2D context is available (Req 6.15)", async () => {
    stubMatchMedia(false);
    const { createCanvasEngine, scene } = await loadEngine();
    const canvas = createCanvas(null);
    expect(createCanvasEngine(canvas, { scene, pulseIntervalMs: background.pulseIntervalMs, seed: 1 })).toBeNull();
  });

  it("draws on the first frame and keeps its loop running while visible in full motion", async () => {
    stubMatchMedia(false);
    stubVisibility("visible");
    const { createCanvasEngine, scene } = await loadEngine();
    const ctx = createFakeContext();
    const engine = createCanvasEngine(createCanvas(ctx), {
      scene,
      pulseIntervalMs: background.pulseIntervalMs,
      seed: 1,
    })!;
    expect(engine).not.toBeNull();
    // Full motion defers the draw to the first scheduled animation frame.
    expect(rafCallbacks.length).toBe(1);
    flushFrame(16);
    expect(clearRects(ctx)).toBeGreaterThanOrEqual(1);
    // The loop reschedules itself for the next frame.
    expect(rafCallbacks.length).toBe(1);

    const before = ctx.calls.length;
    flushFrame(32);
    expect(ctx.calls.length).toBeGreaterThan(before);
    engine.destroy();
  });

  it("does not run the loop while the tab is hidden (Req 6.10)", async () => {
    stubMatchMedia(false);
    stubVisibility("hidden");
    const { createCanvasEngine, scene } = await loadEngine();
    const ctx = createFakeContext();
    const engine = createCanvasEngine(createCanvas(ctx), {
      scene,
      pulseIntervalMs: background.pulseIntervalMs,
      seed: 1,
    })!;
    // Hidden at start: no animation frame is scheduled (clock stays paused).
    expect(rafCallbacks.length).toBe(0);
    engine.destroy();
  });

  it("renders a single static frame under reduced motion and stops its loop (Req 6.11)", async () => {
    stubMatchMedia(true);
    stubVisibility("visible");
    const { createCanvasEngine, scene } = await loadEngine();
    const ctx = createFakeContext();
    const engine = createCanvasEngine(createCanvas(ctx), {
      scene,
      pulseIntervalMs: background.pulseIntervalMs,
      seed: 1,
    })!;
    // Reduced motion: a static frame is drawn immediately, but no rAF loop is scheduled.
    expect(clearRects(ctx)).toBeGreaterThanOrEqual(1);
    expect(rafCallbacks.length).toBe(0);
    engine.destroy();
  });

  it("re-reads the palette and redraws when the Theme changes (Req 5.2)", async () => {
    stubMatchMedia(true); // reduced so the loop is idle and the only redraw is the theme one
    stubVisibility("visible");
    document.documentElement.classList.add("dark");
    const { createCanvasEngine, scene, themeStore } = await loadEngine();
    const ctx = createFakeContext();
    const engine = createCanvasEngine(createCanvas(ctx), {
      scene,
      pulseIntervalMs: background.pulseIntervalMs,
      seed: 1,
    })!;
    const before = clearRects(ctx);

    const getStyle = vi.spyOn(window, "getComputedStyle");
    themeStore.setTheme("light");

    expect(clearRects(ctx)).toBeGreaterThan(before);
    // The palette is re-read from the computed styles on the theme change.
    expect(getStyle).toHaveBeenCalled();
    engine.destroy();
  });

  it("swaps a rebuilt scene via setScene and redraws while idle", async () => {
    stubMatchMedia(true); // idle loop so setScene triggers the redraw we assert on
    stubVisibility("visible");
    const { createCanvasEngine, scene, buildScene } = await loadEngine();
    const ctx = createFakeContext();
    const engine = createCanvasEngine(createCanvas(ctx), {
      scene,
      pulseIntervalMs: background.pulseIntervalMs,
      seed: 1,
    })!;
    const before = clearRects(ctx);

    const mobile = buildScene(background.seed, "mobile", background);
    engine.setScene(mobile);
    expect(clearRects(ctx)).toBeGreaterThan(before);

    // Swapping in the identical reference is a no-op (no extra redraw).
    const same = clearRects(ctx);
    engine.setScene(mobile);
    expect(clearRects(ctx)).toBe(same);
    engine.destroy();
  });

  it("reveals the Neural_Layer immediately when reduced and only once", async () => {
    stubMatchMedia(true);
    stubVisibility("visible");
    const { createCanvasEngine, scene } = await loadEngine();
    const ctx = createFakeContext();
    const engine = createCanvasEngine(createCanvas(ctx), {
      scene,
      pulseIntervalMs: background.pulseIntervalMs,
      seed: 1,
    })!;
    const before = clearRects(ctx);
    engine.revealNeural();
    const afterFirst = clearRects(ctx);
    // A reveal under reduced motion redraws the static frame (now with the neural edges at full alpha).
    expect(afterFirst).toBeGreaterThan(before);
    // Revealing again is idempotent: no further redraw.
    engine.revealNeural();
    expect(clearRects(ctx)).toBe(afterFirst);
    engine.destroy();
  });

  it("stops drawing and clears the canvas on destroy, removing its listeners", async () => {
    stubMatchMedia(false);
    stubVisibility("visible");
    const { createCanvasEngine, scene, buildScene } = await loadEngine();
    const ctx = createFakeContext();
    const removeDoc = vi.spyOn(document, "removeEventListener");
    const removeWin = vi.spyOn(window, "removeEventListener");
    const engine = createCanvasEngine(createCanvas(ctx), {
      scene,
      pulseIntervalMs: background.pulseIntervalMs,
      seed: 1,
    })!;

    engine.destroy();
    expect(removeDoc).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(removeWin).toHaveBeenCalledWith("resize", expect.any(Function));

    // After destroy, a leftover queued frame is inert (no new draws).
    const after = ctx.calls.length;
    flushFrame(32);
    expect(ctx.calls.length).toBe(after);
    // setScene and revealNeural are no-ops after destroy.
    engine.setScene(buildScene(1, "mobile", background));
    engine.revealNeural();
    expect(ctx.calls.length).toBe(after);
  });

  it("blanks the layer via onError when drawing throws, without itself throwing (Req 6.15)", async () => {
    stubMatchMedia(true); // reduced so the engine draws its static frame synchronously on create
    stubVisibility("visible");
    const { createCanvasEngine, scene } = await loadEngine();
    const ctx = createFakeContext();
    ctx.shouldThrow = true;
    const onError = vi.fn();
    expect(() =>
      createCanvasEngine(createCanvas(ctx), {
        scene,
        pulseIntervalMs: background.pulseIntervalMs,
        seed: 1,
        onError,
      }),
    ).not.toThrow();
    // The first draw threw: the error was reported and the engine stopped itself.
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("pauses the clock while hidden and resumes without replaying missed time (Req 6.10)", async () => {
    stubMatchMedia(false);
    const visibility = stubVisibility("visible");
    const { createCanvasEngine, scene } = await loadEngine();
    const ctx = createFakeContext();
    const engine = createCanvasEngine(createCanvas(ctx), {
      scene,
      pulseIntervalMs: background.pulseIntervalMs,
      seed: 1,
    })!;

    // Two visible frames 16 ms apart advance the clock and draw the moving parts.
    flushFrame(1000);
    flushFrame(1016);
    const movedCalls = ctx.calls.length;
    expect(movedCalls).toBeGreaterThan(0);

    // Hide the tab and fire visibilitychange: the loop stops and queues no frame.
    visibility.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    const afterHide = ctx.calls.length;
    // A long gap passes while hidden; a stray queued frame does nothing.
    flushFrame(60_000);
    expect(ctx.calls.length).toBe(afterHide);

    // Becoming visible again resumes the loop from where it paused (no catch-up jump).
    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(rafCallbacks.length).toBeGreaterThan(0);
    engine.destroy();
  });
});
