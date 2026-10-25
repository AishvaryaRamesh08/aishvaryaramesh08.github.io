// Pure Background_Layer scene, parallax and pulse logic (Req 6.1–6.5, 6.7, 6.9).
// No DOM access: the renderer decides the viewport class, feeds scroll/clock numbers in and draws
// the returned plain data (SVG <use> for icons and lines, canvas for packets and pulses).
//
// Coordinate space: every scene is laid out in a fixed virtual viewport of
// `SCENE_VIEWPORT[viewportClass]` pixels (origin top-left, y down). The renderer maps it onto the
// real viewport with an SVG viewBox (`preserveAspectRatio="xMidYMid slice"`) and the matching
// canvas transform. Every object's bounding box lies inside [0, width] × [0, height].
import type { BackgroundConfig, DepthLayer } from "../data/types";
import { mulberry32, randomBetween, randomIndex, type Rng } from "../lib/random";

export type ViewportClass = "mobile" | "desktop";

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Mobile_Viewport boundary used by the renderer's media query (Req 6.9). */
export const MOBILE_MEDIA_QUERY = "(max-width: 767.98px)";

/** Virtual viewport each scene is laid out in. */
export const SCENE_VIEWPORT: Readonly<Record<ViewportClass, Size>> = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

/** Hard ceiling for any decorative opacity (Req 6.1). */
export const MAX_DECORATIVE_OPACITY = 0.15;
/** SQL_Ticker opacity band (Req 6.7). */
export const TICKER_OPACITY_RANGE: readonly [number, number] = [0.05, 0.08];
/** Packet travel speed range along a relationship line, in scene px per second. */
export const PACKET_SPEED_RANGE: readonly [number, number] = [40, 80];
/** Icon edge length of the farthest layer, in scene px; nearer layers are larger. */
const BASE_ICON_SIZE: Readonly<Record<ViewportClass, number>> = { desktop: 32, mobile: 26 };
const NEURAL_NODE_RADIUS = 3;
const NEURAL_LINKS_PER_NODE = 2;

/** Icon glyphs drawn by the Background_Layer (Req 6.2). */
export type IconKind = "database" | "table" | "key-pk" | "key-fk" | "schema" | "cloud" | "warehouse" | "lakehouse";

/** Kinds treated as database nodes: endpoints of relationship lines and pulse targets (Req 6.4, 6.5). */
export const DATABASE_NODE_KINDS: readonly IconKind[] = ["database", "schema"];

/** Kinds used after each layer's two guaranteed database cylinders. */
const FILL_KINDS: readonly IconKind[] = [
  "table",
  "key-pk",
  "key-fk",
  "schema",
  "cloud",
  "warehouse",
  "lakehouse",
  "database",
];

export interface SceneLayer {
  index: number;
  /** Parallax speed, a fraction of scroll (0 < speed < 1 for a valid config). */
  speed: number;
  opacity: number;
}

export interface SceneIcon {
  id: string;
  kind: IconKind;
  layer: number;
  /** Center of the icon. */
  x: number;
  y: number;
  /** Edge length of the square icon box. */
  size: number;
  opacity: number;
}

export type Cardinality = "one" | "many";

/** ERD-style orthogonal polyline between two distinct database nodes of the same layer. */
export interface RelationshipLine {
  id: string;
  layer: number;
  fromId: string;
  toId: string;
  /** At least two points; first = center of `fromId`, last = center of `toId`. */
  points: readonly Point[];
  /** Crow's-foot end markers (one-to-many). */
  cardinality: { from: Cardinality; to: Cardinality };
  opacity: number;
}

export interface ScenePacket {
  id: string;
  lineId: string;
  layer: number;
  /** Starting progress along the line, in [0, 1). */
  phase: number;
  /** Constant arc-length speed, scene px per second. */
  speed: number;
  opacity: number;
}

export interface NeuralNode {
  id: string;
  layer: number;
  x: number;
  y: number;
  radius: number;
  /** IDs of database nodes in the same layer this node connects to. */
  links: readonly string[];
  opacity: number;
}

export interface Scene {
  seed: number;
  viewportClass: ViewportClass;
  viewport: Size;
  layers: readonly SceneLayer[];
  icons: readonly SceneIcon[];
  lines: readonly RelationshipLine[];
  packets: readonly ScenePacket[];
  neuralNodes: readonly NeuralNode[];
  ticker: { opacity: number; snippets: readonly string[] };
}

/** Viewport class for a CSS viewport width, matching `MOBILE_MEDIA_QUERY`. */
export function viewportClassFor(width: number): ViewportClass {
  return width < 768 ? "mobile" : "desktop";
}

export function isDatabaseNode(icon: Pick<SceneIcon, "kind">): boolean {
  return DATABASE_NODE_KINDS.includes(icon.kind);
}

/** Decorative objects counted against the object budget: icons + packets + neural nodes (Req 6.9). */
export function sceneObjectCount(scene: Pick<Scene, "icons" | "packets" | "neuralNodes">): number {
  return scene.icons.length + scene.packets.length + scene.neuralNodes.length;
}

const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);
const wholeCount = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** Object budget for a viewport class: the desktop count, or the mobile cap (never above desktop). */
export function objectBudget(vc: ViewportClass, cfg: Pick<BackgroundConfig, "desktopObjectCount" | "mobileObjectCap">): number {
  const desktop = wholeCount(cfg.desktopObjectCount);
  return vc === "mobile" ? Math.min(wholeCount(cfg.mobileObjectCap), desktop) : desktop;
}

/**
 * Splits the budget into icons, packets and neural nodes, scaling the configured packet and
 * neural counts by budget/desktop so the mobile scene keeps the desktop proportions.
 */
function allocate(budget: number, layerCount: number, cfg: BackgroundConfig) {
  const desktop = wholeCount(cfg.desktopObjectCount);
  const ratio = desktop > 0 ? budget / desktop : 0;
  const neural = Math.min(Math.round(wholeCount(cfg.neuralNodeCount) * ratio), budget);
  let packets = Math.min(Math.round(wholeCount(cfg.packetCount) * ratio), budget - neural);
  let icons = budget - neural - packets;
  // A relationship line needs two database nodes in one layer, i.e. more icons than layers.
  // Without any line, packets have nowhere to travel, so their share goes to icons.
  if (icons <= layerCount) {
    icons += packets;
    packets = 0;
  }
  return { icons, packets, neural };
}

/** Splits `n` items across `k` buckets as evenly as possible, earlier buckets first. */
function distribute(n: number, k: number): number[] {
  const base = Math.floor(n / k);
  return Array.from({ length: k }, (_, i) => base + (i < n % k ? 1 : 0));
}

/**
 * Jittered-grid placement of `count` boxes of edge `size` inside `viewport`, so objects spread out
 * instead of clumping. Every returned center keeps the box fully inside the viewport.
 */
function placeInGrid(rng: Rng, count: number, size: number, viewport: Size): Point[] {
  if (count === 0) return [];
  const half = size / 2;
  const innerW = Math.max(0, viewport.width - size);
  const innerH = Math.max(0, viewport.height - size);
  const cols = Math.max(1, Math.ceil(Math.sqrt((count * viewport.width) / viewport.height)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  // Fisher–Yates shuffle so the used cells are spread across the grid.
  for (let i = cells.length - 1; i > 0; i--) {
    const j = randomIndex(rng, i + 1);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  return cells.slice(0, count).map((cell) => {
    const col = cell % cols;
    const row = Math.floor(cell / cols);
    return {
      x: clamp(half + (col + rng()) * cellW, half, viewport.width - half),
      y: clamp(half + (row + rng()) * cellH, half, viewport.height - half),
    };
  });
}

/** Orthogonal ERD elbow from `a` to `b`: horizontal, vertical, horizontal. */
function elbow(a: Point, b: Point): Point[] {
  const midX = (a.x + b.x) / 2;
  return [{ x: a.x, y: a.y }, { x: midX, y: a.y }, { x: midX, y: b.y }, { x: b.x, y: b.y }];
}

const distanceSq = (a: Point, b: Point): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/**
 * Seeded, pure scene generator (Req 6.1–6.5, 6.9). Places icons across the depth layers (each
 * layer starts with two database cylinders), links every layer's database nodes with a
 * nearest-earlier-neighbour tree of crow's-foot polylines, puts packets on those lines and neural
 * nodes next to database nodes. The total of icons + packets + neural nodes equals
 * `objectBudget(vc, cfg)`, so a Mobile_Viewport never exceeds `mobileObjectCap`. All opacities are
 * clamped to `min(cfg.maxOpacity, 0.15)`; the ticker to 0.05–0.08.
 */
export function buildScene(seed: number, vc: ViewportClass, cfg: BackgroundConfig): Scene {
  const rng = mulberry32(seed);
  const viewport = SCENE_VIEWPORT[vc];
  const opacityCap = clamp(Number.isFinite(cfg.maxOpacity) ? cfg.maxOpacity : MAX_DECORATIVE_OPACITY, 0, MAX_DECORATIVE_OPACITY);
  const toOpacity = (v: number): number => clamp(Number.isFinite(v) ? v : 0, 0, opacityCap);

  const layers: SceneLayer[] = cfg.depthLayers.map((layer: DepthLayer, index) => ({
    index,
    speed: layer.speed,
    opacity: toOpacity(layer.opacity),
  }));

  const counts = allocate(objectBudget(vc, cfg), layers.length, cfg);
  const iconsPerLayer = distribute(counts.icons, layers.length);

  const icons: SceneIcon[] = [];
  const lines: RelationshipLine[] = [];
  const dbByLayer: SceneIcon[][] = layers.map(() => []);

  layers.forEach((layer, li) => {
    // Nearer (faster) layers draw slightly larger icons for a sense of depth.
    const size = BASE_ICON_SIZE[vc] * (1 + 0.25 * li);
    const positions = placeInGrid(rng, iconsPerLayer[li], size, viewport);
    positions.forEach((p, k) => {
      const kind: IconKind = k < 2 ? "database" : FILL_KINDS[randomIndex(rng, FILL_KINDS.length)];
      const icon: SceneIcon = { id: `icon-${li}-${k}`, kind, layer: li, x: p.x, y: p.y, size, opacity: layer.opacity };
      icons.push(icon);
      if (isDatabaseNode(icon)) dbByLayer[li].push(icon);
    });

    const db = dbByLayer[li];
    for (let i = 1; i < db.length; i++) {
      let nearest = db[0];
      for (let j = 1; j < i; j++) if (distanceSq(db[j], db[i]) < distanceSq(nearest, db[i])) nearest = db[j];
      lines.push({
        id: `line-${li}-${i}`,
        layer: li,
        fromId: nearest.id,
        toId: db[i].id,
        points: elbow(nearest, db[i]),
        cardinality: { from: "one", to: "many" },
        opacity: layer.opacity,
      });
    }
  });

  const packets: ScenePacket[] = [];
  if (lines.length > 0) {
    const start = randomIndex(rng, lines.length);
    for (let p = 0; p < counts.packets; p++) {
      const line = lines[(start + p) % lines.length];
      packets.push({
        id: `packet-${p}`,
        lineId: line.id,
        layer: line.layer,
        phase: rng(),
        speed: randomBetween(rng, PACKET_SPEED_RANGE[0], PACKET_SPEED_RANGE[1]),
        // Packets are the brightest decorative element but still within the cap.
        opacity: opacityCap,
      });
    }
  }

  // Neural nodes go to layers that have database nodes (round-robin), linking to the nearest ones.
  const linkable = layers.map((l) => l.index).filter((li) => dbByLayer[li].length > 0);
  const neuralLayers = linkable.length > 0 ? linkable : [0];
  const neuralPerLayer = distribute(counts.neural, neuralLayers.length);
  const neuralNodes: NeuralNode[] = [];
  neuralLayers.forEach((li, slot) => {
    const positions = placeInGrid(rng, neuralPerLayer[slot], NEURAL_NODE_RADIUS * 2, viewport);
    positions.forEach((p, k) => {
      const links = [...(dbByLayer[li] ?? [])]
        .sort((a, b) => distanceSq(a, p) - distanceSq(b, p))
        .slice(0, NEURAL_LINKS_PER_NODE)
        .map((icon) => icon.id);
      neuralNodes.push({
        id: `neural-${li}-${k}`,
        layer: li,
        x: p.x,
        y: p.y,
        radius: NEURAL_NODE_RADIUS,
        links,
        opacity: layers[li]?.opacity ?? 0,
      });
    });
  });

  const tickerOpacity = Number.isFinite(cfg.ticker.opacity) ? cfg.ticker.opacity : TICKER_OPACITY_RANGE[0];
  return {
    seed,
    viewportClass: vc,
    viewport,
    layers,
    icons,
    lines,
    packets,
    neuralNodes,
    ticker: {
      opacity: clamp(tickerOpacity, TICKER_OPACITY_RANGE[0], TICKER_OPACITY_RANGE[1]),
      snippets: cfg.ticker.snippets,
    },
  };
}

/**
 * Per-layer vertical parallax offsets in px (negative = up) for `transform: translate3d(0, y, 0)`
 * (Req 6.3): `-scrollY × speed`. With every speed in (0, 1) and all speeds distinct, each layer moves
 * slower than the foreground and at its own rate. Negative (overscroll) scroll values count as 0.
 */
export function layerOffsets(scrollY: number, layers: readonly Pick<SceneLayer, "speed">[]): number[] {
  const y = Number.isFinite(scrollY) && scrollY > 0 ? scrollY : 0;
  return layers.map((layer) => (y === 0 ? 0 : -y * (Number.isFinite(layer.speed) ? layer.speed : 0)));
}

/** Total arc length of a polyline. */
export function polylineLength(points: readonly Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return length;
}

/** Wraps any real number into [0, 1); NaN and ±Infinity map to 0. */
function wrap01(t: number): number {
  if (!Number.isFinite(t)) return 0;
  const w = t - Math.floor(t);
  return w >= 1 ? 0 : w;
}

/**
 * Point at arc-length fraction `t` along the line (Req 6.4): 0 = the `from` database node,
 * approaching 1 = the `to` node. `t` wraps modulo 1, so the result always lies on the polyline.
 */
export function packetPosition(line: Pick<RelationshipLine, "points">, t: number): Point {
  const pts = line.points;
  if (pts.length === 0) return { x: 0, y: 0 };
  const total = polylineLength(pts);
  if (pts.length === 1 || total === 0) return { x: pts[0].x, y: pts[0].y };
  let remaining = wrap01(t) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg > 0 && remaining <= seg) {
      const f = remaining / seg;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    remaining -= seg;
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y };
}

/**
 * Progress of a packet along its line after `elapsedMs` of animation clock, at the packet's
 * constant arc-length speed. Reduced motion uses `packetPosition(line, 0.5)` instead.
 */
export function packetProgress(
  packet: Pick<ScenePacket, "phase" | "speed">,
  line: Pick<RelationshipLine, "points">,
  elapsedMs: number,
): number {
  const length = polylineLength(line.points);
  if (!(length > 0) || !Number.isFinite(elapsedMs)) return wrap01(packet.phase);
  return wrap01(packet.phase + ((elapsedMs / 1000) * packet.speed) / length);
}

/**
 * Delay before the next database-node pulse (Req 6.5): uniform in `range` (by default the
 * configured [3000, 8000] ms). Out-of-range or non-finite rng values are clamped into the range.
 */
export function nextPulseDelay(rng: Rng, range: readonly [number, number]): number {
  const [min, max] = range[0] <= range[1] ? range : [range[1], range[0]];
  const r = rng();
  const u = Number.isFinite(r) ? clamp(r, 0, 1) : 0;
  return clamp(min + u * (max - min), min, max);
}

/** A randomly chosen database node to pulse, or `undefined` when the scene has none (Req 6.5). */
export function pickPulseNode(rng: Rng, scene: Pick<Scene, "icons">): SceneIcon | undefined {
  const nodes = scene.icons.filter(isDatabaseNode);
  return nodes.length > 0 ? nodes[randomIndex(rng, nodes.length)] : undefined;
}
