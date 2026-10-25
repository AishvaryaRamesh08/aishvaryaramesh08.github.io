// Canvas 2D engine for the moving parts of the Background_Layer: Data_Packets, database-node
// pulses and neural edges (Req 1.3, 6.4–6.6, 6.10, 6.11, 6.14, 5.2). Loaded with a dynamic
// import after first paint, so it is its own lazy chunk and never blocks LCP.
//
// - Draws at `min(devicePixelRatio, 2)`.
// - Time comes from the visible-only clock: the rAF loop stops while the tab is hidden and resumes
//   from the paused position (Req 6.10).
// - Reduced motion: one static frame (packets at line midpoints, no pulses, no drift), loop
//   stopped; switches live on motion-store changes (Req 6.11, 6.14).
// - Palette tokens are re-read on every Theme change and the frame is redrawn at once (Req 5.2).
import { getMotionMode, subscribeMotionMode, type MotionMode } from "../../hooks/motionStore";
import { subscribeTheme } from "../../hooks/themeStore";
import { mulberry32, type Rng } from "../../lib/random";
import { advanceClock, createClock, type Clock } from "../clock";
import { sliceTransform, wrappedLayerOffsets } from "../geometry";
import {
  nextPulseDelay,
  packetPosition,
  packetProgress,
  pickPulseNode,
  type RelationshipLine,
  type Scene,
  type SceneIcon,
} from "../scene";

/** Highest canvas backing-store scale. */
export const MAX_CANVAS_DPR = 2;
/** Neural_Layer fade-in duration (Req 6.6: within 1 s). */
export const NEURAL_FADE_MS = 800;
/** Duration of one database-node pulse ring. */
export const PULSE_DURATION_MS = 900;

export interface CanvasEngineOptions {
  scene: Scene;
  /** Pulse interval range in ms (Req 6.5). */
  pulseIntervalMs: readonly [number, number];
  /** Seed of the pulse RNG. */
  seed: number;
  /** Called once if drawing throws; the engine has already stopped and cleared the canvas. */
  onError?: (error: unknown) => void;
}

export interface CanvasEngine {
  /** Swaps in a rebuilt scene (e.g. after crossing the 768 px boundary). */
  setScene(scene: Scene): void;
  /** Starts the Neural_Layer fade (instant under reduced motion). Idempotent. */
  revealNeural(): void;
  /** Stops the loop, removes every listener and clears the canvas. */
  destroy(): void;
}

interface Palette {
  packet: string;
  pulse: string;
  neural: string;
}

const FALLBACK_PALETTE: Palette = { packet: "#22d3ee", pulse: "#22d3ee", neural: "#8b5cf6" };

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    packet: read("--color-cyan", FALLBACK_PALETTE.packet),
    pulse: read("--color-cyan", FALLBACK_PALETTE.pulse),
    neural: read("--color-violet", FALLBACK_PALETTE.neural),
  };
}

interface Pulse {
  icon: SceneIcon;
  /** Clock time the pulse started. */
  start: number;
}

/**
 * Starts the engine on `canvas`. Returns `null` when a 2D context is unavailable: the canvas is
 * then simply skipped and the SVG layers stay (Req 6.15).
 */
export function createCanvasEngine(canvas: HTMLCanvasElement, options: CanvasEngineOptions): CanvasEngine | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let scene = options.scene;
  let icons = new Map<string, SceneIcon>();
  let lines = new Map<string, RelationshipLine>();
  const rng: Rng = mulberry32(options.seed ^ 0x9e3779b9);
  let motion: MotionMode = getMotionMode();
  let palette = readPalette();
  let clock: Clock = createClock();
  let pulse: Pulse | null = null;
  let nextPulseAt = 0;
  let neuralRevealedAt: number | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;
  let running = false;
  let destroyed = false;

  const index = () => {
    icons = new Map(scene.icons.map((icon) => [icon.id, icon]));
    lines = new Map(scene.lines.map((line) => [line.id, line]));
    pulse = null;
    nextPulseAt = clock.elapsed + nextPulseDelay(rng, options.pulseIntervalMs);
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(0, Math.round(width * dpr));
    canvas.height = Math.max(0, Math.round(height * dpr));
  };

  const neuralAlpha = (now: number): number => {
    if (neuralRevealedAt === null) return 0;
    if (motion === "reduced") return 1;
    return Math.min(1, Math.max(0, (now - neuralRevealedAt) / NEURAL_FADE_MS));
  };

  const draw = (now: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (width <= 0 || height <= 0) return;
    const reduced = motion === "reduced";
    const { scale, tx, ty } = sliceTransform(scene.viewport, width, height);
    const offsets = reduced ? scene.layers.map(() => 0) : wrappedLayerOffsets(window.scrollY, scene.layers, height);
    // Each depth layer is two stacked viewport-high tiles (see wrappedLayerOffsets).
    const tiles = (layer: number): number[] => {
      const base = ty + (offsets[layer] ?? 0);
      return base === ty ? [base] : [base, base + height];
    };
    const sx = (x: number) => tx + x * scale;

    // Neural edges: neural node → linked database nodes (Req 6.6).
    const na = neuralAlpha(now);
    if (na > 0) {
      ctx.strokeStyle = palette.neural;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.lineDashOffset = reduced ? 0 : -clock.elapsed * 0.02;
      for (const node of scene.neuralNodes) {
        ctx.globalAlpha = node.opacity * na;
        ctx.beginPath();
        for (const oy of tiles(node.layer)) {
          for (const id of node.links) {
            const icon = icons.get(id);
            if (!icon) continue;
            ctx.moveTo(sx(node.x), oy + node.y * scale);
            ctx.lineTo(sx(icon.x), oy + icon.y * scale);
          }
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Data_Packets on relationship lines (Req 6.4); frozen at midpoints when reduced (Req 6.11).
    ctx.fillStyle = palette.packet;
    const radius = Math.max(1.5, 2.5 * scale);
    for (const packet of scene.packets) {
      const line = lines.get(packet.lineId);
      if (!line) continue;
      const t = reduced ? 0.5 : packetProgress(packet, line, clock.elapsed);
      const p = packetPosition(line, t);
      ctx.globalAlpha = packet.opacity;
      ctx.beginPath();
      for (const oy of tiles(packet.layer)) {
        ctx.moveTo(sx(p.x) + radius, oy + p.y * scale);
        ctx.arc(sx(p.x), oy + p.y * scale, radius, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Database-node pulse ring (Req 6.5).
    if (!reduced && pulse) {
      const progress = (clock.elapsed - pulse.start) / PULSE_DURATION_MS;
      if (progress >= 0 && progress < 1) {
        const { icon } = pulse;
        const r = (icon.size / 2) * (1 + 0.6 * progress) * scale;
        ctx.strokeStyle = palette.pulse;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = icon.opacity * (1 - progress);
        ctx.beginPath();
        for (const oy of tiles(icon.layer)) {
          ctx.moveTo(sx(icon.x) + r, oy + icon.y * scale);
          ctx.arc(sx(icon.x), oy + icon.y * scale, r, 0, Math.PI * 2);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  const clear = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const safeDraw = (now: number) => {
    if (destroyed) return;
    try {
      draw(now);
    } catch (error) {
      engine.destroy();
      options.onError?.(error);
    }
  };

  const updatePulse = () => {
    if (pulse && clock.elapsed - pulse.start >= PULSE_DURATION_MS) pulse = null;
    if (clock.elapsed >= nextPulseAt) {
      const icon = pickPulseNode(rng, scene);
      if (icon) pulse = { icon, start: clock.elapsed };
      nextPulseAt = clock.elapsed + nextPulseDelay(rng, options.pulseIntervalMs);
    }
  };

  const frame = (now: number) => {
    if (!running) return;
    clock = advanceClock(clock, now, true);
    updatePulse();
    safeDraw(now);
    if (running) raf = requestAnimationFrame(frame);
  };

  const shouldRun = () => !destroyed && motion === "full" && document.visibilityState !== "hidden";

  /** Starts or stops the loop to match motion mode and tab visibility. */
  const sync = () => {
    if (shouldRun()) {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
      return;
    }
    if (running) {
      cancelAnimationFrame(raf);
      running = false;
    }
    // Drop the frame reference so resuming continues without catching up (Req 6.10).
    clock = advanceClock(clock, performance.now(), false);
    if (motion === "reduced") {
      pulse = null;
      safeDraw(performance.now());
    }
  };

  const redrawIfIdle = () => {
    if (!running) safeDraw(performance.now());
  };

  const onResize = () => {
    resize();
    redrawIfIdle();
  };

  const unsubscribeMotion = subscribeMotionMode(() => {
    motion = getMotionMode();
    sync();
  });
  const unsubscribeTheme = subscribeTheme(() => {
    palette = readPalette();
    // Redraw in the same frame as the class swap (Req 5.2).
    safeDraw(performance.now());
  });
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("resize", onResize, { passive: true });

  const engine: CanvasEngine = {
    setScene(next) {
      if (destroyed || next === scene) return;
      scene = next;
      index();
      redrawIfIdle();
    },
    revealNeural() {
      if (destroyed || neuralRevealedAt !== null) return;
      neuralRevealedAt = performance.now();
      redrawIfIdle();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      cancelAnimationFrame(raf);
      unsubscribeMotion();
      unsubscribeTheme();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", onResize);
      clear();
    },
  };

  index();
  resize();
  sync();
  if (!running) safeDraw(performance.now());
  return engine;
}
