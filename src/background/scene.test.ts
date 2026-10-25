import { describe, expect, it } from "vitest";
import { background } from "../data/background";
import { mulberry32 } from "../lib/random";
import {
  buildScene,
  isDatabaseNode,
  layerOffsets,
  nextPulseDelay,
  packetPosition,
  packetProgress,
  pickPulseNode,
  sceneObjectCount,
  viewportClassFor,
} from "./scene";

describe("mulberry32", () => {
  it("is deterministic per seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const values = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(values);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("buildScene", () => {
  const desktop = buildScene(background.seed, "desktop", background);
  const mobile = buildScene(background.seed, "mobile", background);

  it("is a pure function of its inputs", () => {
    expect(buildScene(background.seed, "desktop", background)).toEqual(desktop);
  });

  it("uses the desktop count on desktop and the mobile cap on mobile", () => {
    expect(sceneObjectCount(desktop)).toBe(background.desktopObjectCount);
    expect(sceneObjectCount(mobile)).toBe(background.mobileObjectCap);
    expect(desktop.packets).toHaveLength(background.packetCount);
    expect(desktop.neuralNodes).toHaveLength(background.neuralNodeCount);
  });

  it("keeps opacities within the caps and objects inside the scene viewport", () => {
    for (const scene of [desktop, mobile]) {
      const { width, height } = scene.viewport;
      for (const icon of scene.icons) {
        expect(icon.opacity).toBeLessThanOrEqual(0.15);
        expect(icon.x - icon.size / 2).toBeGreaterThanOrEqual(0);
        expect(icon.x + icon.size / 2).toBeLessThanOrEqual(width);
        expect(icon.y - icon.size / 2).toBeGreaterThanOrEqual(0);
        expect(icon.y + icon.size / 2).toBeLessThanOrEqual(height);
      }
      for (const o of [...scene.lines, ...scene.packets, ...scene.neuralNodes]) expect(o.opacity).toBeLessThanOrEqual(0.15);
      expect(scene.ticker.opacity).toBe(0.06);
    }
  });

  it("connects distinct database nodes of the same layer, across all depth layers", () => {
    const byId = new Map(desktop.icons.map((i) => [i.id, i]));
    expect(desktop.lines.length).toBeGreaterThan(0);
    for (const line of desktop.lines) {
      const from = byId.get(line.fromId)!;
      const to = byId.get(line.toId)!;
      expect(from.id).not.toBe(to.id);
      expect(isDatabaseNode(from) && isDatabaseNode(to)).toBe(true);
      expect(from.layer).toBe(line.layer);
      expect(to.layer).toBe(line.layer);
      expect(line.points[0]).toEqual({ x: from.x, y: from.y });
      expect(line.points[line.points.length - 1]).toEqual({ x: to.x, y: to.y });
    }
    expect(new Set(desktop.icons.map((i) => i.layer))).toEqual(new Set([0, 1, 2]));
  });
});

describe("layerOffsets", () => {
  it("moves each layer up at its own speed, slower than the scroll", () => {
    expect(layerOffsets(1000, background.depthLayers)).toEqual([-100, -200, -350]);
    expect(layerOffsets(0, background.depthLayers)).toEqual([0, 0, 0]);
    expect(layerOffsets(-40, background.depthLayers)).toEqual([0, 0, 0]);
  });
});

describe("packetPosition", () => {
  const line = { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] };

  it("interpolates by arc length and wraps t", () => {
    expect(packetPosition(line, 0)).toEqual({ x: 0, y: 0 });
    expect(packetPosition(line, 0.25)).toEqual({ x: 5, y: 0 });
    expect(packetPosition(line, 0.5)).toEqual({ x: 10, y: 0 });
    expect(packetPosition(line, 0.75)).toEqual({ x: 10, y: 5 });
    expect(packetPosition(line, 1.25)).toEqual({ x: 5, y: 0 });
  });

  it("advances progress at a constant arc-length speed", () => {
    // 20 px line, 10 px/s: one second moves half the line.
    expect(packetProgress({ phase: 0.1, speed: 10 }, line, 1000)).toBeCloseTo(0.6);
  });
});

describe("nextPulseDelay and pickPulseNode", () => {
  it("maps rng output onto the [3000, 8000] ms range", () => {
    expect(nextPulseDelay(() => 0, background.pulseIntervalMs)).toBe(3000);
    expect(nextPulseDelay(() => 0.5, background.pulseIntervalMs)).toBe(5500);
    expect(nextPulseDelay(() => 0.999999, background.pulseIntervalMs)).toBeLessThanOrEqual(8000);
  });

  it("picks a database node", () => {
    const scene = buildScene(1, "mobile", background);
    expect(isDatabaseNode(pickPulseNode(mulberry32(7), scene)!)).toBe(true);
  });
});

describe("viewportClassFor", () => {
  it("switches at the 768 px boundary", () => {
    expect(viewportClassFor(767)).toBe("mobile");
    expect(viewportClassFor(768)).toBe("desktop");
  });
});
