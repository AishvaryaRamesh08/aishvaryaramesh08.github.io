// Feature: portfolio-website, Property 5: One node per skill —
// for any skills config, the constellation layout contains exactly one node per distinct skill id,
// and each node has exactly one edge to the hub of every cluster that lists it.
// **Validates: Requirements 17.3**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { skillIds, type SkillId, type SkillsConfig } from "../data/types";
import { buildConstellationLayout, type ConstellationViewport } from "./skills";

const viewports: ConstellationViewport[] = ["mobile", "tablet", "desktop"];

/** Mostly small pools so clusters overlap heavily; sometimes the whole id list for larger maps. */
const arbPool = fc.oneof(
  { weight: 3, arbitrary: fc.shuffledSubarray([...skillIds], { minLength: 1, maxLength: 8 }) },
  { weight: 1, arbitrary: fc.shuffledSubarray([...skillIds], { minLength: 1 }) },
);

/**
 * Skills config over the pool: skills may be missing from `cfg.skills` (cluster-only ids) or appear
 * in no cluster (unclustered), clusters may repeat a skill or reuse another cluster's id.
 */
const arbConfig: fc.Arbitrary<SkillsConfig> = arbPool.chain((pool) =>
  fc.record({
    skills: fc.subarray(pool).map((ids) => ids.map((id) => ({ id, name: `Name ${id}` }))),
    clusters: fc.array(
      fc.record({
        id: fc.constantFrom("cloud", "data", "ml", "viz"),
        name: fc.string({ maxLength: 8 }),
        skills: fc.array(fc.constantFrom(...pool), { maxLength: 10 }),
      }),
      { maxLength: 6 },
    ),
  }),
);

const arbScenario = fc.record({ cfg: arbConfig, viewport: fc.constantFrom(...viewports) });

// ---------- independent oracle ----------

/** Every id in `cfg.skills` or any cluster, once. */
function oracleSkillIds(cfg: SkillsConfig): Set<SkillId> {
  return new Set<SkillId>([...cfg.skills.map((s) => s.id), ...cfg.clusters.flatMap((c) => c.skills)]);
}

/** Every (cluster index, skill) membership, duplicates inside a cluster counted once. */
function oracleMemberships(cfg: SkillsConfig): string[] {
  return cfg.clusters.flatMap((c, i) => [...new Set(c.skills)].map((id) => `${i}:${id}`)).sort();
}

describe("Property 5: One node per skill", () => {
  it("has exactly one node per distinct skill id and one edge per (skill, cluster) membership", () => {
    fc.assert(
      fc.property(arbScenario, ({ cfg, viewport }) => {
        const layout = buildConstellationLayout(cfg, viewport);
        expect(layout.mode).toBe(viewport === "mobile" ? "lanes" : "graph");

        // One hub per cluster entry, identified by index (repeated cluster ids still get a hub).
        expect(layout.hubs.map((h) => h.clusterIndex)).toEqual(cfg.clusters.map((_, i) => i));

        // Nodes: unique and covering exactly the distinct skill ids.
        const nodeIds = layout.nodes.map((n) => n.skillId);
        expect(new Set(nodeIds).size).toBe(nodeIds.length);
        expect([...nodeIds].sort()).toEqual([...oracleSkillIds(cfg)].sort());

        // Edges: exactly the memberships, each once.
        const edgeKeys = layout.edges.map((e) => `${e.clusterIndex}:${e.skillId}`).sort();
        expect(edgeKeys).toEqual(oracleMemberships(cfg));
        expect(new Set(layout.edges.map((e) => e.id)).size).toBe(layout.edges.length);

        const nodeById = new Map(layout.nodes.map((n) => [n.skillId, n]));
        for (const edge of layout.edges) {
          const node = nodeById.get(edge.skillId)!;
          const hub = layout.hubs[edge.clusterIndex]!;
          expect(edge.from).toEqual({ x: node.x, y: node.y });
          expect(edge.to).toEqual({ x: hub.x, y: hub.y });
        }

        // Each node's cluster list and shared flag match the clusters that list it.
        for (const node of layout.nodes) {
          const expected = cfg.clusters.flatMap((c, i) => (c.skills.includes(node.skillId) ? [i] : []));
          expect([...node.clusterIndices]).toEqual(expected);
          expect(node.shared).toBe(expected.length >= 2);
        }
      }),
    );
  });

  it("places every hub and node centre inside [0, width] × [0, height]", () => {
    fc.assert(
      fc.property(arbScenario, ({ cfg, viewport }) => {
        const layout = buildConstellationLayout(cfg, viewport);
        for (const p of [...layout.hubs, ...layout.nodes]) {
          expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(layout.width);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(layout.height);
        }
      }),
    );
  });
});
