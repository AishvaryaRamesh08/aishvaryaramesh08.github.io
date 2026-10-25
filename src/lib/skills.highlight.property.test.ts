// Feature: portfolio-website, Property 4: Highlight consistency —
// for any skills config, any project list and any selected skill s, computeHighlight(s) returns
// related = every other skill sharing at least one cluster with s, and projects = exactly the
// projects whose tech list contains s. The result is the same whichever cluster the node was
// reached from, and projects is empty exactly when no tech list contains s.
// **Validates: Requirements 17.4, 17.6, 17.7**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { skillIds, type CaseStudy, type ProjectId, type SkillId, type SkillsConfig } from "../data/types";
import { clusterIndicesOf, computeHighlight, distinctSkillIds } from "./skills";

/** A small pool of skill ids per run so clusters overlap (shared skills) and projects hit often. */
const arbPool = fc.shuffledSubarray([...skillIds], { minLength: 1, maxLength: 8 });

/** Skills config over the pool: clusters with possible duplicates, shared skills and repeated cluster ids. */
const arbConfig = (pool: SkillId[]): fc.Arbitrary<SkillsConfig> =>
  fc.record({
    skills: fc
      .subarray(pool)
      .map((ids) => ids.map((id) => ({ id, name: `Name ${id}` }))),
    clusters: fc.array(
      fc.record({
        id: fc.constantFrom("cloud", "data", "ml", "viz"),
        name: fc.string({ maxLength: 8 }),
        skills: fc.array(fc.constantFrom(...pool), { maxLength: 6 }),
      }),
      { maxLength: 5 },
    ),
  });

/** Case_Study-like projects; only `id` and `tech` are read. Ids may repeat. */
const arbProjects = (pool: SkillId[]): fc.Arbitrary<CaseStudy[]> =>
  fc.array(
    fc.record({
      id: fc.constantFrom("p1", "p2", "p3", "p4", "p5", "p6"),
      tech: fc.array(fc.constantFrom(...pool), { maxLength: 5 }),
    }),
    { maxLength: 6 },
  ) as unknown as fc.Arbitrary<CaseStudy[]>;

const arbScenario = arbPool.chain((pool) =>
  fc.record({
    cfg: arbConfig(pool),
    projects: arbProjects(pool),
    skill: fc.constantFrom(...pool),
  }),
);

// ---------- independent oracle ----------

function oracleRelated(skill: SkillId, cfg: SkillsConfig): Set<SkillId> {
  const related = new Set<SkillId>();
  for (const other of distinctSkillIds(cfg)) {
    if (other === skill) continue;
    const sharesCluster = cfg.clusters.some((c) => c.skills.includes(skill) && c.skills.includes(other));
    if (sharesCluster) related.add(other);
  }
  return related;
}

function oracleProjects(skill: SkillId, projects: readonly CaseStudy[]): Set<ProjectId> {
  return new Set(projects.filter((p) => p.tech.includes(skill)).map((p) => p.id));
}

const sorted = <T extends string>(set: Set<T>): T[] => [...set].sort();

describe("Property 4: Highlight consistency", () => {
  it("related is every other skill sharing a cluster; projects is exactly those using the skill", () => {
    fc.assert(
      fc.property(arbScenario, ({ cfg, projects, skill }) => {
        const result = computeHighlight(skill, cfg, projects);

        expect(result.selected).toBe(skill);
        expect(result.related.has(skill)).toBe(false);
        expect(sorted(result.related)).toEqual(sorted(oracleRelated(skill, cfg)));
        expect(sorted(result.projects)).toEqual(sorted(oracleProjects(skill, projects)));

        // Req 17.7: empty projects (→ "no featured project" note) exactly when no tech list has s.
        const anyUses = projects.some((p) => p.tech.includes(skill));
        expect(result.projects.size === 0).toBe(!anyUses);
      }),
    );
  });

  it("is the same whichever cluster the node was reached from and regardless of cluster order", () => {
    fc.assert(
      fc.property(arbScenario, ({ cfg, projects, skill }) => {
        const baseline = computeHighlight(skill, cfg, projects);
        const expectRelated = sorted(baseline.related);
        const expectProjects = sorted(baseline.projects);

        // Reach the node via each cluster that lists it: the id taken from that cluster's entry.
        for (const index of clusterIndicesOf(skill, cfg)) {
          const reached = cfg.clusters[index]!.skills.find((id) => id === skill)!;
          const viaCluster = computeHighlight(reached, cfg, projects);
          expect(sorted(viaCluster.related)).toEqual(expectRelated);
          expect(sorted(viaCluster.projects)).toEqual(expectProjects);
        }

        // Cluster order and within-cluster order do not matter.
        const reordered: SkillsConfig = {
          skills: [...cfg.skills].reverse(),
          clusters: [...cfg.clusters].reverse().map((c) => ({ ...c, skills: [...c.skills].reverse() })),
        };
        const fromReordered = computeHighlight(skill, reordered, projects);
        expect(sorted(fromReordered.related)).toEqual(expectRelated);
        expect(sorted(fromReordered.projects)).toEqual(expectProjects);
      }),
    );
  });
});
