// Deterministic, SSR-safe layout for the Dependency_Demo graph (Req 13.1). D3 is overkill for a
// small, fixed set of fictional jobs and would pull a force simulation (and its non-determinism)
// into first paint, so this computes stable node coordinates purely from the edge list: jobs are
// placed in dependency layers (longest path from a source) left to right, and spread evenly within
// each layer top to bottom. The same input always yields the same positions, so the server and the
// first client render match and Tab order follows content order.
import type { DependencyEdge, JobId } from "../../data/types";

export interface LaidOutNode {
  id: JobId;
  label: string;
  /** Center coordinates in the SVG viewBox. */
  x: number;
  y: number;
}

export interface GraphLayout {
  nodes: readonly LaidOutNode[];
  /** Straight directed edges between laid-out node centers (`from → to`). */
  links: readonly { from: LaidOutNode; to: LaidOutNode }[];
  width: number;
  height: number;
}

export interface LayoutOptions {
  /** Horizontal gap between dependency layers. */
  columnGap?: number;
  /** Vertical gap between nodes in the same layer. */
  rowGap?: number;
  /** Padding around the node field. */
  padding?: number;
}

/**
 * Assigns each job a layer = the longest dependency chain ending at it. Cycles are handled by a
 * visited guard, so a job in a cycle simply keeps its first-seen layer and the function always
 * terminates. Jobs with no incoming edge start at layer 0.
 */
function assignLayers(
  jobs: readonly { id: JobId }[],
  edges: readonly DependencyEdge[],
): Map<JobId, number> {
  const successors = new Map<JobId, JobId[]>();
  for (const { from, to } of edges) {
    const list = successors.get(from);
    if (list) list.push(to);
    else successors.set(from, [to]);
  }

  const layer = new Map<JobId, number>(jobs.map((j) => [j.id, 0]));
  // Relax layers by walking forward from every job; a visited set per source makes cycles safe.
  for (const job of jobs) {
    const visited = new Set<JobId>([job.id]);
    const stack: JobId[] = [job.id];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const base = layer.get(current) ?? 0;
      for (const next of successors.get(current) ?? []) {
        if (!layer.has(next)) continue; // edge endpoint not in the job list; ignore defensively
        if ((layer.get(next) ?? 0) < base + 1) layer.set(next, base + 1);
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }
  }
  return layer;
}

/**
 * Lays out the dependency graph into stable coordinates. Pure: no DOM, no randomness, no time.
 */
export function layoutGraph(
  jobs: readonly { id: JobId; label: string }[],
  edges: readonly DependencyEdge[],
  { columnGap = 170, rowGap = 72, padding = 48 }: LayoutOptions = {},
): GraphLayout {
  const layerOf = assignLayers(jobs, edges);

  // Group jobs by layer, preserving their content order for a stable vertical arrangement.
  const byLayer = new Map<number, { id: JobId; label: string }[]>();
  let maxLayer = 0;
  for (const job of jobs) {
    const l = layerOf.get(job.id) ?? 0;
    maxLayer = Math.max(maxLayer, l);
    const bucket = byLayer.get(l);
    if (bucket) bucket.push(job);
    else byLayer.set(l, [job]);
  }

  const maxRows = Math.max(1, ...[...byLayer.values()].map((b) => b.length));
  const fieldHeight = (maxRows - 1) * rowGap;

  const placed = new Map<JobId, LaidOutNode>();
  const nodes: LaidOutNode[] = [];
  for (const [l, bucket] of [...byLayer.entries()].sort((a, b) => a[0] - b[0])) {
    const x = padding + l * columnGap;
    // Center this layer's column vertically within the tallest column.
    const columnHeight = (bucket.length - 1) * rowGap;
    const top = padding + (fieldHeight - columnHeight) / 2;
    bucket.forEach((job, index) => {
      const node: LaidOutNode = { id: job.id, label: job.label, x, y: top + index * rowGap };
      placed.set(job.id, node);
      nodes.push(node);
    });
  }

  const links: { from: LaidOutNode; to: LaidOutNode }[] = [];
  for (const { from, to } of edges) {
    const a = placed.get(from);
    const b = placed.get(to);
    if (a && b) links.push({ from: a, to: b });
  }

  const width = padding * 2 + maxLayer * columnGap;
  const height = padding * 2 + fieldHeight;
  return { nodes, links, width, height };
}
