// Feature: portfolio-website, Property 38: Pulse interval —
// for any random value in [0, 1), nextPulseDelay returns a delay in [3000, 8000] ms; out-of-range
// and non-finite rng values are clamped into the range. The pulse target is always a database node.
// **Validates: Requirements 6.5**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { background } from "../data/background";
import type { BackgroundConfig } from "../data/types";
import { mulberry32, type Rng } from "../lib/random";
import { buildScene, isDatabaseNode, nextPulseDelay, pickPulseNode, type ViewportClass } from "./scene";

const config: BackgroundConfig = background;
const range = config.pulseIntervalMs as readonly [number, number];
const [MIN, MAX] = range;

const arbSeed = fc.integer({ min: 0, max: 0xffffffff });
const arbViewportClass = fc.constantFrom<ViewportClass>("mobile", "desktop");

/** Any value an rng might return, including adversarial ones outside [0, 1) and non-finite. */
const arbAnyRngValue = fc.oneof(
  fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }),
  fc.double(),
  fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0, 1, -1e308, 1e308),
);

describe("Property 38: Pulse interval", () => {
  it("uses the configured [3000, 8000] ms range", () => {
    expect(range).toEqual([3000, 8000]);
  });

  it("every delay from a seeded rng lies in the configured range", () => {
    fc.assert(
      fc.property(arbSeed, fc.integer({ min: 1, max: 50 }), (seed, draws) => {
        const rng = mulberry32(seed);
        for (let i = 0; i < draws; i++) {
          const delay = nextPulseDelay(rng, range);
          expect(Number.isFinite(delay)).toBe(true);
          expect(delay).toBeGreaterThanOrEqual(MIN);
          expect(delay).toBeLessThanOrEqual(MAX);
        }
      }),
    );
  });

  it("maps a value u in [0, 1) uniformly to MIN + u × (MAX − MIN)", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }), (u) => {
        const delay = nextPulseDelay(() => u, range);
        expect(delay).toBeGreaterThanOrEqual(MIN);
        expect(delay).toBeLessThanOrEqual(MAX);
        expect(delay).toBeCloseTo(MIN + u * (MAX - MIN), 6);
      }),
    );
  });

  it("clamps out-of-range and non-finite rng values into the range", () => {
    fc.assert(
      fc.property(arbAnyRngValue, (r) => {
        const delay = nextPulseDelay(() => r, range);
        expect(Number.isFinite(delay)).toBe(true);
        expect(delay).toBeGreaterThanOrEqual(MIN);
        expect(delay).toBeLessThanOrEqual(MAX);
      }),
    );
  });

  it("pickPulseNode returns a database node from the scene for any seed", () => {
    fc.assert(
      fc.property(arbSeed, arbViewportClass, arbSeed, (sceneSeed, vc, pickSeed) => {
        const scene = buildScene(sceneSeed, vc, config);
        const hasDatabaseNode = scene.icons.some(isDatabaseNode);
        const rng: Rng = mulberry32(pickSeed);
        const node = pickPulseNode(rng, scene);
        if (!hasDatabaseNode) {
          expect(node).toBeUndefined();
          return;
        }
        expect(node).toBeDefined();
        expect(isDatabaseNode(node!)).toBe(true);
        expect(scene.icons).toContain(node);
      }),
    );
  });
});
