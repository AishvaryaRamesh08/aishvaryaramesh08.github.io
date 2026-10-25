// Pure mapping helpers shared by the SVG layers and the canvas engine (Req 6.2, 6.3).
import { layerOffsets, type Point, type SceneLayer, type Size } from "./scene";

export interface SliceTransform {
  scale: number;
  tx: number;
  ty: number;
}

/**
 * Maps the virtual scene viewport onto a `width × height` box exactly like
 * `preserveAspectRatio="xMidYMid slice"`: uniform scale that covers the box, centered.
 */
export function sliceTransform(viewport: Size, width: number, height: number): SliceTransform {
  if (!(viewport.width > 0 && viewport.height > 0 && width > 0 && height > 0)) return { scale: 1, tx: 0, ty: 0 };
  const scale = Math.max(width / viewport.width, height / viewport.height);
  return { scale, tx: (width - viewport.width * scale) / 2, ty: (height - viewport.height * scale) / 2 };
}

/**
 * Parallax offsets (`-scrollY × speed`, Req 6.3) wrapped into `(-height, 0]`. Each depth layer is
 * drawn as two stacked viewport-high tiles, so a wrapped offset keeps the layer covering the
 * viewport at any scroll depth.
 */
export function wrappedLayerOffsets(scrollY: number, layers: readonly Pick<SceneLayer, "speed">[], height: number): number[] {
  return layerOffsets(scrollY, layers).map((offset) => {
    if (!(height > 0) || !Number.isFinite(offset) || offset === 0) return 0;
    const wrapped = -(-offset % height);
    return wrapped === 0 ? 0 : wrapped;
  });
}

const segmentLength = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Removes `start` px of arc length from the beginning and `end` px from the end of a polyline, so
 * relationship lines stop at an icon's edge instead of crossing its glyph. Returns `[]` when the
 * line is too short to show anything.
 */
export function trimPolyline(points: readonly Point[], start: number, end: number): Point[] {
  const total = points.slice(1).reduce((sum, p, i) => sum + segmentLength(points[i], p), 0);
  if (points.length < 2 || !(total > start + end)) return [];
  const from = Math.max(0, start);
  const to = total - Math.max(0, end);
  const out: Point[] = [];
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = segmentLength(a, b);
    const segStart = travelled;
    const segEnd = travelled + seg;
    travelled = segEnd;
    if (seg === 0 || segEnd < from || segStart > to) continue;
    const at = (d: number): Point => {
      const f = (d - segStart) / seg;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    };
    if (out.length === 0) out.push(at(Math.max(from, segStart)));
    out.push(at(Math.min(to, segEnd)));
  }
  return out.length >= 2 ? out : [];
}

/** Unit direction from `a` to `b` (zero vector when they coincide). */
function direction(a: Point, b: Point): Point {
  const len = segmentLength(a, b);
  return len > 0 ? { x: (b.x - a.x) / len, y: (b.y - a.y) / len } : { x: 0, y: 0 };
}

const fmt = (n: number): string => (Math.round(n * 100) / 100).toString();

/**
 * SVG path data for crow's-foot ERD markers on an (already trimmed) relationship line: a double
 * bar ("exactly one") at the start and a bar plus three-prong foot ("many") at the end (Req 6.2).
 */
export function crowsFootPath(points: readonly Point[], size = 6): string {
  if (points.length < 2) return "";
  const s = points[0];
  const d0 = direction(s, points[1]);
  const e = points[points.length - 1];
  const d1 = direction(points[points.length - 2], e);
  const parts: string[] = [];
  const bar = (c: Point, d: Point, half: number) => {
    const n = { x: -d.y, y: d.x };
    parts.push(`M${fmt(c.x + n.x * half)} ${fmt(c.y + n.y * half)}L${fmt(c.x - n.x * half)} ${fmt(c.y - n.y * half)}`);
  };
  const half = size * 0.6;
  // "One" end: two short bars just after the start.
  bar({ x: s.x + d0.x * size * 0.6, y: s.y + d0.y * size * 0.6 }, d0, half);
  bar({ x: s.x + d0.x * size, y: s.y + d0.y * size }, d0, half);
  // "Many" end: prongs from a point `size` before the end fanning out to the end.
  const base = { x: e.x - d1.x * size, y: e.y - d1.y * size };
  const n1 = { x: -d1.y, y: d1.x };
  for (const k of [-1, 0, 1]) {
    parts.push(`M${fmt(base.x)} ${fmt(base.y)}L${fmt(e.x + n1.x * half * k)} ${fmt(e.y + n1.y * half * k)}`);
  }
  bar({ x: base.x - d1.x * size * 0.4, y: base.y - d1.y * size * 0.4 }, d1, half);
  return parts.join("");
}

/** `points` as an SVG `points` attribute value. */
export function toSvgPoints(points: readonly Point[]): string {
  return points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ");
}
