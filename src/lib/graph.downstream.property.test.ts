// Feature: portfolio-website, Property 1: Downstream reachability — for any graph (incl. cycles) and
// node f, downstream(f) = reachable(f) \ {f}, with no duplicates, and empty exactly when f has no
// reachable successor other than itself.
// **Validates: Requirements 13.4, 13.7**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { DependencyEdge, JobId } from "../data/types";
import { downstream } from "./graph";

interface Graph {
  readonly nodes: readonly JobId[];
  readonly edges: readonly DependencyEdge[];
}

/**
 * 1–30 nodes with random directed edges over them: cycles, self-loops, duplicate edges and
 * isolated nodes all occur naturally. Ids are fictional job names.
 */
const arbGraph: fc.Arbitrary<Graph> = fc.integer({ min: 1, max: 30 }).chain((n) => {
  const nodes = Array.from({ length: n }, (_, i) => `job-${i}`);
  const arbIndex = fc.integer({ min: 0, max: n - 1 });
  return fc
    .array(fc.tuple(arbIndex, arbIndex), { maxLength: n * 3 })
    .map((pairs) => ({ nodes, edges: pairs.map(([a, b]) => ({ from: nodes[a]!, to: nodes[b]! })) }));
});

/** Graph plus one of its nodes to fail. */
const arbGraphAndNode = arbGraph.chain((g) =>
  fc.constantFrom(...g.nodes).map((failed) => ({ ...g, failed })),
);

/**
 * Reference transitive closure (Floyd–Warshall): reach[i][j] is true when j is reachable from i by
 * following one or more edges. Independent of the BFS under test.
 */
function transitiveClosure({ nodes, edges }: Graph): { index: Map<JobId, number>; reach: boolean[][] } {
  const index = new Map(nodes.map((id, i) => [id, i] as const));
  const n = nodes.length;
  const reach = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  for (const { from, to } of edges) reach[index.get(from)!]![index.get(to)!] = true;
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      if (reach[i]![k])
        for (let j = 0; j < n; j++) if (reach[k]![j]) reach[i]![j] = true;
  return { index, reach };
}

/** Oracle: nodes reachable from `failed` via ≥ 1 edge, minus `failed` itself. */
function expectedDownstream(g: Graph, failed: JobId): Set<JobId> {
  const { index, reach } = transitiveClosure(g);
  const row = reach[index.get(failed)!]!;
  return new Set(g.nodes.filter((id, j) => row[j] && id !== failed));
}

const sorted = (s: Iterable<JobId>) => [...s].sort();

describe("Property 1: Downstream reachability", () => {
  it("equals the reference transitive closure from the failed node, minus the node itself", () => {
    fc.assert(
      fc.property(arbGraphAndNode, ({ nodes, edges, failed }) => {
        const result = downstream(edges, failed);
        expect(sorted(result)).toEqual(sorted(expectedDownstream({ nodes, edges }, failed)));
      }),
    );
  });

  it("never includes the failed node, even when it lies on a cycle or has a self-loop", () => {
    fc.assert(
      fc.property(arbGraphAndNode, ({ edges, failed }) => {
        // Force a self-loop and a 2-cycle back to `failed` on top of the random edges.
        const withLoops = [...edges, { from: failed, to: failed }];
        const back = edges.find((e) => e.from === failed && e.to !== failed);
        if (back) withLoops.push({ from: back.to, to: failed });
        expect(downstream(withLoops, failed).has(failed)).toBe(false);
      }),
    );
  });

  it("only contains nodes that are reachable from the failed node and appear in the graph", () => {
    fc.assert(
      fc.property(arbGraphAndNode, ({ nodes, edges, failed }) => {
        const expected = expectedDownstream({ nodes, edges }, failed);
        const result = downstream(edges, failed);
        for (const id of result) {
          expect(nodes).toContain(id);
          expect(expected.has(id)).toBe(true);
        }
        // Set semantics plus BFS uniqueness: iteration yields each job exactly once.
        expect(new Set([...result]).size).toBe([...result].length);
      }),
    );
  });

  it("is empty exactly when the failed node has no reachable successor other than itself", () => {
    fc.assert(
      fc.property(arbGraphAndNode, ({ nodes, edges, failed }) => {
        const hasOtherSuccessor = expectedDownstream({ nodes, edges }, failed).size > 0;
        expect(downstream(edges, failed).size === 0).toBe(!hasOtherSuccessor);
      }),
    );
  });

  it("is empty for sinks: nodes with no outgoing edges, or only a self-loop", () => {
    fc.assert(
      fc.property(arbGraphAndNode, fc.boolean(), ({ edges, failed }, selfLoop) => {
        const sinkEdges = edges.filter((e) => e.from !== failed);
        if (selfLoop) sinkEdges.push({ from: failed, to: failed });
        expect(downstream(sinkEdges, failed).size).toBe(0);
      }),
    );
  });

  it("returns an empty set for a node absent from the edge list", () => {
    expect(downstream([], "job-0").size).toBe(0);
    expect(downstream([{ from: "a", to: "b" }], "z").size).toBe(0);
  });
});
