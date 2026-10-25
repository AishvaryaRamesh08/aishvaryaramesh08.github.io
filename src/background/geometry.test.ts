// Unit tests for the pure Background_Layer geometry helpers that shape the SVG layers and feed the
// canvas engine (Req 6.2, 6.3). `trimPolyline` must pull a relationship line back from both icon
// edges, `crowsFootPath` must emit ERD markers only for a usable line, `wrappedLayerOffsets` must
// keep each depth layer's two stacked tiles covering the viewport, and `toSvgPoints` must format.
import { describe, expect, it } from "vitest";
import type { Point } from "./scene";
import { crowsFootPath, sliceTransform, toSvgPoints, trimPolyline, wrappedLayerOffsets } from "./geometry";

/** Arc length of a polyline, used to assert how much `trimPolyline` removed. */
function length(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return total;
}

describe("trimPolyline", () => {
  const line: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it("shortens the line from both ends by the requested arc length", () => {
    const trimmed = trimPolyline(line, 14, 14);
    expect(trimmed[0].x).toBeCloseTo(14);
    expect(trimmed[0].y).toBeCloseTo(0);
    expect(trimmed[trimmed.length - 1].x).toBeCloseTo(86);
    expect(trimmed[trimmed.length - 1].y).toBeCloseTo(0);
    // 100 px line minus 14 from each end leaves 72.
    expect(length(trimmed)).toBeCloseTo(72);
  });

  it("supports asymmetric start and end trims", () => {
    const trimmed = trimPolyline(line, 10, 30);
    expect(trimmed[0].x).toBeCloseTo(10);
    expect(trimmed[trimmed.length - 1].x).toBeCloseTo(70);
  });

  it("trims across multiple segments of an elbow polyline", () => {
    const elbow: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ];
    // Total length 100; remove 10 from the start and 10 from the end.
    const trimmed = trimPolyline(elbow, 10, 10);
    expect(trimmed[0].x).toBeCloseTo(10);
    expect(trimmed[0].y).toBeCloseTo(0);
    expect(trimmed[trimmed.length - 1].x).toBeCloseTo(50);
    expect(trimmed[trimmed.length - 1].y).toBeCloseTo(40);
    expect(length(trimmed)).toBeCloseTo(80);
  });

  it("returns an empty line when the trims meet or exceed its length", () => {
    expect(trimPolyline(line, 50, 50)).toEqual([]);
    expect(trimPolyline(line, 80, 80)).toEqual([]);
    expect(trimPolyline([{ x: 0, y: 0 }], 1, 1)).toEqual([]);
  });

  it("treats negative trims as zero", () => {
    const trimmed = trimPolyline(line, -5, -5);
    expect(trimmed[0]).toEqual({ x: 0, y: 0 });
    expect(trimmed[trimmed.length - 1]).toEqual({ x: 100, y: 0 });
  });
});

describe("crowsFootPath", () => {
  const trimmed: Point[] = [
    { x: 20, y: 0 },
    { x: 80, y: 0 },
  ];

  it("emits path data with both the one-end bars and the many-end prongs", () => {
    const d = crowsFootPath(trimmed);
    expect(d).not.toBe("");
    // Every sub-path is a move + line; count the moves as a proxy for the marker strokes.
    const moves = d.match(/M/g) ?? [];
    // Two "one" bars + three "many" prongs + one "many" bar = six strokes.
    expect(moves).toHaveLength(6);
  });

  it("returns an empty string for a degenerate line", () => {
    expect(crowsFootPath([{ x: 0, y: 0 }])).toBe("");
    expect(crowsFootPath([])).toBe("");
  });
});

describe("toSvgPoints", () => {
  it("joins rounded coordinates as an SVG points attribute", () => {
    expect(
      toSvgPoints([
        { x: 1.234, y: 5.678 },
        { x: 10, y: 20 },
      ]),
    ).toBe("1.23,5.68 10,20");
  });
});

describe("wrappedLayerOffsets", () => {
  const layers = [{ speed: 0.1 }, { speed: 0.2 }, { speed: 0.35 }];

  it("wraps each layer's parallax offset into (-height, 0] so the stacked tiles keep covering", () => {
    const height = 800;
    // scrollY 10000: raw offsets are -1000, -2000, -3500; all wrap into (-height, 0].
    const offsets = wrappedLayerOffsets(10_000, layers, height);
    for (const offset of offsets) {
      expect(offset).toBeGreaterThan(-height);
      expect(offset).toBeLessThanOrEqual(0);
    }
    // A tile placed at `top-full` (offset + height) plus the base tile always spans the viewport.
    for (const offset of offsets) expect(offset + height).toBeGreaterThanOrEqual(height + offset);
  });

  it("returns zero offsets at the top of the page", () => {
    expect(wrappedLayerOffsets(0, layers, 800)).toEqual([0, 0, 0]);
  });

  it("guards against a non-positive viewport height", () => {
    expect(wrappedLayerOffsets(500, layers, 0)).toEqual([0, 0, 0]);
  });
});

describe("sliceTransform", () => {
  it("covers the box with a uniform centered scale (xMidYMid slice)", () => {
    // 100×100 viewport into a 200×400 box: scale to cover the taller box (4×), center horizontally.
    const t = sliceTransform({ width: 100, height: 100 }, 200, 400);
    expect(t.scale).toBe(4);
    expect(t.tx).toBe((200 - 100 * 4) / 2);
    expect(t.ty).toBe(0);
  });

  it("is an identity-ish no-op for degenerate sizes", () => {
    expect(sliceTransform({ width: 0, height: 0 }, 100, 100)).toEqual({ scale: 1, tx: 0, ty: 0 });
  });
});
