// Feature: portfolio-website, Property 35: Scene bounds —
// for any seed and valid BackgroundConfig, every object in buildScene has opacity ≤ 0.15
// (ticker 0.05–0.08), and the mobile scene's total object count (icons + packets + neural nodes)
// is ≤ mobileObjectCap, which is strictly less than the desktop scene's count. Every object also
// lies inside the scene viewport, relationship lines join distinct database nodes of one layer,
// and the scene is deterministic for a fixed seed.
// **Validates: Requirements 6.1, 6.7, 6.9**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { background } from "../data/background";
import type { BackgroundConfig, DepthLayer } from "../data/types";
import {
  buildScene,
  isDatabaseNode,
  MAX_DECORATIVE_OPACITY,
  objectBudget,
  SCENE_VIEWPORT,
  sceneObjectCount,
  TICKER_OPACITY_RANGE,
  type Scene,
  type ViewportClass,
} from "./scene";

const arbSeed = fc.integer({ min: 0, max: 0xffffffff });
const arbViewportClass = fc.constantFrom<ViewportClass>("mobile", "desktop");

/** Opacity drawn a little beyond the valid band so the scene's clamping is exercised too. */
const arbOpacity = fc.double({ min: 0, max: 0.3, noNaN: true });

/** 2 or 3 depth layers with distinct speeds in (0, 1). */
const arbDepthLayers = fc
  .uniqueArray(fc.integer({ min: 1, max: 99 }), { minLength: 2, maxLength: 3 })
  .chain((speeds) =>
    fc.tuple(...speeds.map((s) => arbOpacity.map((opacity): DepthLayer => ({ speed: s / 100, opacity })))),
  )
  .map((layers) => layers as unknown as BackgroundConfig["depthLayers"]);

/** Valid-ish BackgroundConfig variations based on `src/data/background.ts`. */
const arbConfig: fc.Arbitrary<BackgroundConfig> = fc
  .integer({ min: 2, max: 160 })
  .chain((desktopObjectCount) =>
    fc.record({
      desktopObjectCount: fc.constant(desktopObjectCount),
      mobileObjectCap: fc.integer({ min: 1, max: desktopObjectCount - 1 }),
      depthLayers: arbDepthLayers,
      packetCount: fc.integer({ min: 0, max: Math.max(0, Math.floor(desktopObjectCount / 3)) }),
      neuralNodeCount: fc.integer({ min: 0, max: Math.max(0, Math.floor(desktopObjectCount / 3)) }),
      maxOpacity: arbOpacity,
      tickerOpacity: fc.double({ min: 0, max: 0.2, noNaN: true }),
    }),
  )
  .map(({ tickerOpacity, ...rest }) => ({
    ...background,
    ...rest,
    ticker: { ...background.ticker, opacity: tickerOpacity },
  }));

function allOpacities(scene: Scene): number[] {
  return [
    ...scene.layers.map((o) => o.opacity),
    ...scene.icons.map((o) => o.opacity),
    ...scene.lines.map((o) => o.opacity),
    ...scene.packets.map((o) => o.opacity),
    ...scene.neuralNodes.map((o) => o.opacity),
  ];
}

describe("Property 35: Scene bounds", () => {
  it("keeps every decorative opacity ≤ 0.15 and the ticker within 0.05–0.08", () => {
    fc.assert(
      fc.property(arbSeed, arbViewportClass, arbConfig, (seed, vc, cfg) => {
        const scene = buildScene(seed, vc, cfg);
        for (const opacity of allOpacities(scene)) {
          expect(opacity).toBeGreaterThanOrEqual(0);
          expect(opacity).toBeLessThanOrEqual(MAX_DECORATIVE_OPACITY);
        }
        expect(scene.ticker.opacity).toBeGreaterThanOrEqual(TICKER_OPACITY_RANGE[0]);
        expect(scene.ticker.opacity).toBeLessThanOrEqual(TICKER_OPACITY_RANGE[1]);
      }),
    );
  });

  it("caps the mobile object count at mobileObjectCap, strictly below the desktop count", () => {
    fc.assert(
      fc.property(arbSeed, arbConfig, (seed, cfg) => {
        const mobile = sceneObjectCount(buildScene(seed, "mobile", cfg));
        const desktop = sceneObjectCount(buildScene(seed, "desktop", cfg));
        expect(mobile).toBeLessThanOrEqual(cfg.mobileObjectCap);
        expect(mobile).toBeLessThanOrEqual(objectBudget("mobile", cfg));
        expect(mobile).toBeLessThan(desktop);
        expect(desktop).toBeLessThanOrEqual(objectBudget("desktop", cfg));
      }),
    );
  });

  it("places every icon box, neural node and line point inside the scene viewport", () => {
    fc.assert(
      fc.property(arbSeed, arbViewportClass, arbConfig, (seed, vc, cfg) => {
        const scene = buildScene(seed, vc, cfg);
        const { width, height } = SCENE_VIEWPORT[vc];
        expect(scene.viewport).toEqual({ width, height });
        for (const icon of scene.icons) {
          const half = icon.size / 2;
          expect(icon.x - half).toBeGreaterThanOrEqual(0);
          expect(icon.x + half).toBeLessThanOrEqual(width);
          expect(icon.y - half).toBeGreaterThanOrEqual(0);
          expect(icon.y + half).toBeLessThanOrEqual(height);
        }
        for (const node of scene.neuralNodes) {
          expect(node.x - node.radius).toBeGreaterThanOrEqual(0);
          expect(node.x + node.radius).toBeLessThanOrEqual(width);
          expect(node.y - node.radius).toBeGreaterThanOrEqual(0);
          expect(node.y + node.radius).toBeLessThanOrEqual(height);
        }
        for (const line of scene.lines) {
          for (const p of line.points) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(width);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThanOrEqual(height);
          }
        }
      }),
    );
  });

  it("connects relationship lines between distinct database nodes of the same layer", () => {
    fc.assert(
      fc.property(arbSeed, arbViewportClass, arbConfig, (seed, vc, cfg) => {
        const scene = buildScene(seed, vc, cfg);
        const iconsById = new Map(scene.icons.map((icon) => [icon.id, icon]));
        const lineIds = new Set(scene.lines.map((line) => line.id));
        for (const line of scene.lines) {
          const from = iconsById.get(line.fromId);
          const to = iconsById.get(line.toId);
          expect(from).toBeDefined();
          expect(to).toBeDefined();
          if (!from || !to) return;
          expect(line.fromId).not.toBe(line.toId);
          expect(isDatabaseNode(from)).toBe(true);
          expect(isDatabaseNode(to)).toBe(true);
          expect(from.layer).toBe(line.layer);
          expect(to.layer).toBe(line.layer);
        }
        for (const packet of scene.packets) expect(lineIds.has(packet.lineId)).toBe(true);
      }),
    );
  });

  it("is deterministic for a fixed seed", () => {
    fc.assert(
      fc.property(arbSeed, arbViewportClass, arbConfig, (seed, vc, cfg) => {
        expect(buildScene(seed, vc, cfg)).toEqual(buildScene(seed, vc, cfg));
      }),
    );
  });
});
