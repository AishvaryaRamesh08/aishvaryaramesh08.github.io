// Feature: portfolio-website, Property 6: Text listing and names are complete —
// for any skills config and project list, the generated text listing names every cluster, lists
// each skill under every cluster it belongs to, and for each skill names exactly its related
// projects or states that there are none. Each skill node's accessible name contains the skill
// name and all of its cluster names.
// **Validates: Requirements 17.8, 17.9**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { skillIds, type CaseStudy, type SkillId, type SkillsConfig } from "../data/types";
import { NO_FEATURED_PROJECT_NOTE, buildSkillTextListing, skillAccessibleName } from "./skills";

/** A small pool of skill ids per run so clusters overlap (shared skills) and projects hit often. */
const arbPool = fc.shuffledSubarray([...skillIds], { minLength: 1, maxLength: 8 });

/** Skills config over the pool: duplicates within a cluster, shared skills, and skills missing from `cfg.skills`. */
const arbConfig = (pool: SkillId[]): fc.Arbitrary<SkillsConfig> =>
  fc.record({
    skills: fc
      .subarray(pool)
      .chain((ids) => fc.tuple(...ids.map((id) => fc.string({ minLength: 1, maxLength: 10 }).map((name) => ({ id, name }))))),
    clusters: fc.array(
      fc.record({
        id: fc.constantFrom("cloud", "data", "ml", "viz"),
        name: fc.string({ minLength: 1, maxLength: 10 }),
        skills: fc.array(fc.constantFrom(...pool), { maxLength: 6 }),
      }),
      { maxLength: 5 },
    ),
  });

/** Case_Study-like projects with distinct ids; only `id`, `title` and `tech` are read. */
const arbProjects = (pool: SkillId[]): fc.Arbitrary<CaseStudy[]> =>
  fc
    .uniqueArray(fc.constantFrom("p1", "p2", "p3", "p4", "p5", "p6"), { maxLength: 6 })
    .chain((ids) =>
      fc.tuple(
        ...ids.map((id) =>
          fc.record({
            id: fc.constant(id),
            title: fc.string({ minLength: 1, maxLength: 12 }),
            tech: fc.array(fc.constantFrom(...pool), { maxLength: 5 }),
          }),
        ),
      ),
    ) as unknown as fc.Arbitrary<CaseStudy[]>;

const arbScenario = arbPool.chain((pool) =>
  fc.record({ pool: fc.constant(pool), cfg: arbConfig(pool), projects: arbProjects(pool) }),
);

// ---------- independent oracle ----------

function oracleName(skill: SkillId, cfg: SkillsConfig): string {
  for (const s of cfg.skills) if (s.id === skill) return s.name;
  return skill;
}

function oracleProjects(skill: SkillId, projects: readonly CaseStudy[]) {
  const result: { id: string; title: string }[] = [];
  for (const p of projects) if (p.tech.indexOf(skill) !== -1) result.push({ id: p.id, title: p.title });
  return result;
}

function oracleProjectsText(list: { title: string }[]): string {
  if (list.length === 0) return NO_FEATURED_PROJECT_NOTE;
  return "Used in: " + list.map((p) => p.title).join(", ") + ".";
}

function oracleListing(cfg: SkillsConfig, projects: readonly CaseStudy[]) {
  return cfg.clusters.map((cluster, clusterIndex) => {
    const ordered: SkillId[] = [];
    for (const id of cluster.skills) if (ordered.indexOf(id) === -1) ordered.push(id);
    return {
      clusterIndex,
      clusterId: cluster.id,
      name: cluster.name,
      skills: ordered.map((id) => {
        const used = oracleProjects(id, projects);
        return { skillId: id, name: oracleName(id, cfg), projects: used, projectsText: oracleProjectsText(used) };
      }),
    };
  });
}

/** Cluster names for `skill` in config order, each distinct name once. */
function oracleClusterNames(skill: SkillId, cfg: SkillsConfig): string[] {
  const names: string[] = [];
  for (const c of cfg.clusters) {
    if (c.skills.indexOf(skill) !== -1 && names.indexOf(c.name) === -1) names.push(c.name);
  }
  return names;
}

// ---------- properties ----------

describe("Property 6: text listing and names are complete", () => {
  it("buildSkillTextListing matches the oracle: every cluster, each skill once in order, exact projects", () => {
    fc.assert(
      fc.property(arbScenario, ({ cfg, projects }) => {
        const listing = buildSkillTextListing(cfg, projects);
        expect(listing).toEqual(oracleListing(cfg, projects));
      }),
    );
  });

  it("a skill in several clusters appears under every one of them with the same entry", () => {
    fc.assert(
      fc.property(arbScenario, ({ pool, cfg, projects }) => {
        const listing = buildSkillTextListing(cfg, projects);
        for (const skill of pool) {
          const memberOf = cfg.clusters.flatMap((c, i) => (c.skills.includes(skill) ? [i] : []));
          const listedUnder = listing.flatMap((c) => (c.skills.some((e) => e.skillId === skill) ? [c.clusterIndex] : []));
          expect(listedUnder).toEqual(memberOf);
          const entries = listing.flatMap((c) => c.skills.filter((e) => e.skillId === skill));
          for (const e of entries) {
            expect(e).toEqual(entries[0]);
            expect(e.projects.length === 0).toBe(e.projectsText === NO_FEATURED_PROJECT_NOTE);
          }
        }
      }),
    );
  });

  it("skillAccessibleName contains the skill name and every cluster name (just the name when unclustered)", () => {
    fc.assert(
      fc.property(arbScenario, ({ pool, cfg }) => {
        for (const skill of pool) {
          const label = skillAccessibleName(skill, cfg);
          const name = oracleName(skill, cfg);
          const clusterNames = oracleClusterNames(skill, cfg);
          expect(label.includes(name)).toBe(true);
          for (const cn of clusterNames) expect(label.includes(cn)).toBe(true);
          expect(label).toBe(clusterNames.length === 0 ? name : `${name} — ${clusterNames.join(", ")}`);
        }
      }),
    );
  });

  it("example: BigQuery shared by Cloud and Databases", () => {
    const cfg: SkillsConfig = {
      skills: [
        { id: "bigquery", name: "BigQuery" },
        { id: "python", name: "Python" },
      ],
      clusters: [
        { id: "cloud", name: "Cloud", skills: ["bigquery"] },
        { id: "db", name: "Databases", skills: ["bigquery"] },
      ],
    };
    expect(skillAccessibleName("bigquery", cfg)).toBe("BigQuery — Cloud, Databases");
    expect(skillAccessibleName("python", cfg)).toBe("Python");
    const listing = buildSkillTextListing(cfg, [{ id: "p1", title: "A", tech: ["bigquery"] }] as unknown as CaseStudy[]);
    expect(listing.map((c) => c.skills[0]!.projectsText)).toEqual(["Used in: A.", "Used in: A."]);
  });
});
