import { describe, expect, it } from "vitest";
import { projects } from "../data/projects";
import { skills } from "../data/skills";
import type { CaseStudy, SkillsConfig } from "../data/types";
import {
  buildConstellationLayout,
  buildSkillTextListing,
  computeHighlight,
  NO_FEATURED_PROJECT_NOTE,
  skillAccessibleName,
} from "./skills";

const cfg: SkillsConfig = skills;
const caseStudies: readonly CaseStudy[] = projects;

describe("computeHighlight", () => {
  it("relates BigQuery to both its clusters and to the projects that use it", () => {
    const h = computeHighlight("bigquery", cfg, caseStudies);
    expect(h.selected).toBe("bigquery");
    expect([...h.related].sort()).toEqual(["aws", "azure", "gcp", "oracle", "sql-server"]);
    expect([...h.projects]).toEqual(["cloud-migration"]);
  });

  it("returns no projects for a skill no Case_Study uses (Req 17.7)", () => {
    const h = computeHighlight("jira", cfg, caseStudies);
    expect(h.projects.size).toBe(0);
    expect(h.related.has("git")).toBe(true);
    expect(h.related.has("jira")).toBe(false);
  });
});

describe("buildConstellationLayout", () => {
  for (const viewport of ["desktop", "tablet", "mobile"] as const) {
    it(`has one node per skill and one edge per membership on ${viewport}`, () => {
      const layout = buildConstellationLayout(cfg, viewport);
      expect(layout.nodes.map((n) => n.skillId).sort()).toEqual(cfg.skills.map((s) => s.id).sort());
      const memberships = cfg.clusters.reduce((sum, c) => sum + c.skills.length, 0);
      expect(layout.edges).toHaveLength(memberships);
      expect(layout.hubs).toHaveLength(cfg.clusters.length);

      const bigquery = layout.nodes.find((n) => n.skillId === "bigquery")!;
      expect(bigquery.shared).toBe(true);
      const bqHubs = layout.edges.filter((e) => e.skillId === "bigquery").map((e) => layout.hubs[e.clusterIndex]!.clusterId);
      expect(bqHubs).toEqual(["cloud", "databases"]);

      for (const p of [...layout.nodes, ...layout.hubs]) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(layout.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(layout.height);
      }
    });
  }

  it("places BigQuery on the seam between the Cloud and Databases lanes on mobile", () => {
    const layout = buildConstellationLayout(cfg, "mobile");
    expect(layout.mode).toBe("lanes");
    const cloud = layout.lanes[1]!;
    const databases = layout.lanes[2]!;
    const bigquery = layout.nodes.find((n) => n.skillId === "bigquery")!;
    expect(bigquery.y).toBeGreaterThan(cloud.y + cloud.height);
    expect(bigquery.y).toBeLessThan(databases.y);
  });

  it("gives dense desktop skill clusters two well-spaced columns", () => {
    const layout = buildConstellationLayout(cfg, "desktop");
    const nodes = layout.nodes.filter((node) => node.clusterIndices.length === 1 && node.clusterIndices[0] === 0);
    const rows = new Map<number, number[]>();
    for (const node of nodes) rows.set(node.y, [...(rows.get(node.y) ?? []), node.x]);
    const minColumnGap = Math.min(...[...rows.values()].map((xs) => Math.abs(xs[0]! - xs[1]!)));
    const rowPositions = [...rows.keys()].sort((a, b) => a - b);
    const minRowGap = Math.min(...rowPositions.slice(1).map((y, index) => y - rowPositions[index]!));

    expect(rowPositions).toHaveLength(5);
    expect(minColumnGap).toBeGreaterThan(180);
    expect(minRowGap).toBe(48);
  });
});

describe("buildSkillTextListing", () => {
  it("lists every cluster and BigQuery under both Cloud and Databases", () => {
    const listing = buildSkillTextListing(cfg, caseStudies);
    expect(listing.map((c) => c.name)).toEqual(cfg.clusters.map((c) => c.name));
    const withBigQuery = listing.filter((c) => c.skills.some((s) => s.skillId === "bigquery")).map((c) => c.clusterId);
    expect(withBigQuery).toEqual(["cloud", "databases"]);
  });

  it("names a skill's projects or states there are none", () => {
    const listing = buildSkillTextListing(cfg, caseStudies);
    const entry = (id: string) => listing.flatMap((c) => c.skills).find((s) => s.skillId === id)!;
    expect(entry("power-bi").projectsText).toBe("Used in: Power BI incident dashboard.");
    expect(entry("jira").projects).toEqual([]);
    expect(entry("jira").projectsText).toBe(NO_FEATURED_PROJECT_NOTE);
  });
});

describe("skillAccessibleName", () => {
  it("contains the skill name and all of its cluster names", () => {
    expect(skillAccessibleName("bigquery", cfg)).toBe("BigQuery — Cloud, Databases");
    expect(skillAccessibleName("python", cfg)).toBe("Python — Data engineering");
  });
});
