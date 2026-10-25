// Property 37: Packets stay on relationship lines.
// **Validates: Requirements 6.4**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { background } from "../data/background";
import {
  buildScene,
  isDatabaseNode,
  packetPosition,
  packetProgress,
  type Point,
  type ViewportClass,
} from "./scene";

/** Distance from `p` to segment `ab` (a zero-length segment is a point). */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const f = lenSq === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + dx * f), p.y - (a.y + dy * f));
}

/** Smallest distance from `p` to any segment of the polyline. */
function distanceToPolyline(p: Point, points: readonly Point[]): number {
  if (points.length === 1) return Math.hypot(p.x - points[0].x, p.y - points[0].y);
  let best = Infinity;
  for (let i = 1; i < points.length; i++) best = Math.min(best, distanceToSegment(p, points[i - 1], points[i]));
  return best;
}

const EPS = 1e-6;

const coord = fc.double({ min: -5000, max: 5000, noNaN: true, noDefaultInfinity: true });
const point = fc.record({ x: coord, y: coord });

/** Same orthogonal H-V-H elbow the scene builds between two database nodes. */
const elbowLine = fc.tuple(point, point).map(([a, b]) => {
  const midX = (a.x + b.x) / 2;
  return [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b];
});

/** Arbitrary polylines with ≥ 2 points, with some points repeated to create zero-length segments. */
const arbitraryLine = fc
  .tuple(fc.array(point, { minLength: 2, maxLength: 8 }), fc.array(fc.nat(), { maxLength: 4 }))
  .map(([pts, dupes]) => {
    const out = [...pts];
    for (const d of dupes) {
      const i = d % out.length;
      out.splice(i, 0, { ...out[i] });
    }
    return out;
  });

const polyline = fc.oneof(elbowLine, arbitraryLine);

/** Any t, including negatives, values ≥ 1, huge magnitudes, NaN and ±Infinity. */
const anyT = fc.oneof(fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }), fc.double());

describe("Property 37: packets stay on relationship lines", () => {
  it("packetPosition lies on the polyline for any t", () => {
    fc.assert(
      fc.property(polyline, anyT, (points, t) => {
        const p = packetPosition({ points }, t);
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(distanceToPolyline(p, points)).toBeLessThanOrEqual(EPS);
      }),
    );
  });

  it("t = 0 (and any integer t) returns the first point", () => {
    fc.assert(
      fc.property(polyline, fc.integer({ min: -1000, max: 1000 }), (points, k) => {
        const p = packetPosition({ points }, k);
        // Numeric equality: -0 and +0 are the same coordinate.
        expect(p.x === points[0].x && p.y === points[0].y).toBe(true);
      }),
    );
  });

  it("every real scene packet lies on its line, whose endpoints are two distinct database nodes", () => {
    const viewport = fc.constantFrom<ViewportClass>("desktop", "mobile");
    const elapsed = fc.oneof(fc.double({ min: 0, max: 1e9, noNaN: true }), fc.double());
    fc.assert(
      fc.property(fc.integer(), viewport, elapsed, (seed, vc, elapsedMs) => {
        const scene = buildScene(seed, vc, background);
        const lines = new Map(scene.lines.map((l) => [l.id, l]));
        const icons = new Map(scene.icons.map((i) => [i.id, i]));
        for (const packet of scene.packets) {
          const line = lines.get(packet.lineId);
          expect(line).toBeDefined();
          if (!line) continue;
          expect(line.points.length).toBeGreaterThanOrEqual(2);
          expect(line.fromId).not.toBe(line.toId);
          const from = icons.get(line.fromId);
          const to = icons.get(line.toId);
          expect(from && isDatabaseNode(from)).toBe(true);
          expect(to && isDatabaseNode(to)).toBe(true);
          expect(line.points[0]).toEqual({ x: from!.x, y: from!.y });
          expect(line.points[line.points.length - 1]).toEqual({ x: to!.x, y: to!.y });

          const t = packetProgress(packet, line, elapsedMs);
          expect(t).toBeGreaterThanOrEqual(0);
          expect(t).toBeLessThan(1);
          const p = packetPosition(line, t);
          expect(distanceToPolyline(p, line.points)).toBeLessThanOrEqual(EPS);
        }
      }),
    );
  });
});
