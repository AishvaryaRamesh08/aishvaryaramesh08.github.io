// Pure Skill_Constellation logic (Req 17.3, 17.4, 17.6–17.9). No DOM access: the section renders
// the layout as SVG and asks `computeHighlight` what to emphasize, so the relationships can be
// property-tested directly (Properties 4, 5 and 6).
//
// Cluster identity is the cluster's index in `cfg.clusters`, so a malformed config with repeated
// cluster ids still yields one hub per cluster entry. A skill listed twice in the same cluster
// counts as one membership.
import type { CaseStudy, ProjectId, SkillId, SkillsConfig } from "../data/types";

// ---------- shared lookups ----------

/** Indices of the clusters that list `skill`, in config order, each once. */
export function clusterIndicesOf(skill: SkillId, cfg: SkillsConfig): number[] {
  const result: number[] = [];
  cfg.clusters.forEach((cluster, index) => {
    if (cluster.skills.includes(skill)) result.push(index);
  });
  return result;
}

/** Display name from `cfg.skills`, falling back to the id for a skill only referenced by a cluster. */
export function skillName(skill: SkillId, cfg: SkillsConfig): string {
  return cfg.skills.find((s) => s.id === skill)?.name ?? skill;
}

/** Every distinct skill id: `cfg.skills` order first, then ids only referenced by clusters. */
export function distinctSkillIds(cfg: SkillsConfig): SkillId[] {
  const ids = new Set<SkillId>(cfg.skills.map((s) => s.id));
  for (const cluster of cfg.clusters) for (const id of cluster.skills) ids.add(id);
  return [...ids];
}

/** Projects whose tech list contains `skill`, in project order, each id once. */
function projectsUsing(skill: SkillId, projects: readonly CaseStudy[]): CaseStudy[] {
  const seen = new Set<ProjectId>();
  const result: CaseStudy[] = [];
  for (const project of projects) {
    if (seen.has(project.id) || !project.tech.includes(skill)) continue;
    seen.add(project.id);
    result.push(project);
  }
  return result;
}

// ---------- highlight (Req 17.4, 17.6, 17.7) ----------

export interface SkillHighlight {
  selected: SkillId;
  /** Every other skill sharing at least one cluster with `selected`; never contains `selected`. */
  related: Set<SkillId>;
  /** Exactly the projects whose tech list contains `selected`. Empty → show the "no featured project" note. */
  projects: Set<ProjectId>;
}

/**
 * What to emphasize when `skill` is hovered, tapped or focused. Depends only on the skill id, so
 * the result is the same whichever cluster the node was reached from (Req 17.6). A skill used by no
 * project yields an empty `projects` set rather than an error (Req 17.7).
 */
export function computeHighlight(skill: SkillId, cfg: SkillsConfig, projects: readonly CaseStudy[]): SkillHighlight {
  const related = new Set<SkillId>();
  for (const index of clusterIndicesOf(skill, cfg)) {
    for (const other of cfg.clusters[index]!.skills) if (other !== skill) related.add(other);
  }
  return {
    selected: skill,
    related,
    projects: new Set(projectsUsing(skill, projects).map((p) => p.id)),
  };
}

// ---------- layout (Req 17.3) ----------

/** Desktop and tablet use a connected cluster chart; mobile uses stacked cluster lanes. */
export type ConstellationViewport = "mobile" | "tablet" | "desktop";

export interface Point {
  x: number;
  y: number;
}

export interface ConstellationHub extends Point {
  /** Index in `cfg.clusters`; the hub's identity. */
  clusterIndex: number;
  clusterId: string;
  name: string;
}

export interface ConstellationNode extends Point {
  skillId: SkillId;
  name: string;
  /** Clusters this skill belongs to, in config order (empty for an unclustered skill). */
  clusterIndices: readonly number[];
  /** True when the skill belongs to two or more clusters (e.g. BigQuery). */
  shared: boolean;
}

/** One edge per (skill, cluster) membership, from the skill node to the cluster hub. */
export interface ConstellationEdge {
  /** Stable React key: `${clusterIndex}:${skillId}`. */
  id: string;
  skillId: SkillId;
  clusterIndex: number;
  from: Point;
  to: Point;
}

/** Background band for a cluster on the mobile lanes layout. */
export interface ConstellationLane {
  clusterIndex: number;
  y: number;
  height: number;
}

export interface ConstellationPanel {
  clusterIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConstellationLayout {
  viewport: ConstellationViewport;
  mode: "graph" | "lanes";
  /** SVG viewBox size; every hub and node centre lies inside [0, width] × [0, height]. */
  width: number;
  height: number;
  hubs: readonly ConstellationHub[];
  /** Exactly one per distinct skill id. */
  nodes: readonly ConstellationNode[];
  edges: readonly ConstellationEdge[];
  /** Empty in graph mode. */
  lanes: readonly ConstellationLane[];
  /** Empty in lanes mode. */
  panels: readonly ConstellationPanel[];
}

interface GraphMetrics {
  width: number;
}

const GRAPH: Readonly<Record<"desktop" | "tablet", GraphMetrics>> = {
  desktop: { width: 1400 },
  tablet: { width: 1000 },
};

const PANEL_GAP = 24;
const PANEL_HEIGHT = 360;
const PANEL_TOP = 24;
const PANEL_BOTTOM = 24;
const NODE_ROW_HEIGHT = 48;
const NODE_AREA_TOP = 105;

const MOBILE = {
  width: 360,
  hubX: 64,
  chipX: 236,
  /** 44 px chip plus an 8 px gap (Req 27.2). */
  row: 52,
  lanePad: 12,
  laneGap: 12,
} as const;

interface Membership {
  id: SkillId;
  clusters: number[];
}

function memberships(cfg: SkillsConfig): Membership[] {
  return distinctSkillIds(cfg).map((id) => ({ id, clusters: clusterIndicesOf(id, cfg) }));
}

function finishLayout(
  viewport: ConstellationViewport,
  mode: ConstellationLayout["mode"],
  size: { width: number; height: number },
  hubs: ConstellationHub[],
  placed: Map<SkillId, Point>,
  members: Membership[],
  cfg: SkillsConfig,
  lanes: ConstellationLane[],
  panels: ConstellationPanel[],
): ConstellationLayout {
  const nodes: ConstellationNode[] = members.map(({ id, clusters }) => ({
    skillId: id,
    name: skillName(id, cfg),
    clusterIndices: clusters,
    shared: clusters.length > 1,
    ...placed.get(id)!,
  }));
  const edges: ConstellationEdge[] = nodes.flatMap((node) =>
    node.clusterIndices.map((clusterIndex) => ({
      id: `${clusterIndex}:${node.skillId}`,
      skillId: node.skillId,
      clusterIndex,
      from: { x: node.x, y: node.y },
      to: { x: hubs[clusterIndex]!.x, y: hubs[clusterIndex]!.y },
    })),
  );
  return { viewport, mode, ...size, hubs, nodes, edges, lanes, panels };
}

function graphLayout(cfg: SkillsConfig, viewport: "desktop" | "tablet"): ConstellationLayout {
  const metrics = GRAPH[viewport];
  const columns = viewport === "desktop" ? 3 : 2;
  const panelWidth = (metrics.width - PANEL_GAP * (columns + 1)) / columns;
  const panelRows = Math.ceil(cfg.clusters.length / columns);
  const panelHeight = PANEL_TOP + panelRows * PANEL_HEIGHT + Math.max(0, panelRows - 1) * PANEL_GAP + PANEL_BOTTOM;
  const panels: ConstellationPanel[] = cfg.clusters.map((_, clusterIndex) => {
    const column = clusterIndex % columns;
    const row = Math.floor(clusterIndex / columns);
    return {
      clusterIndex,
      x: PANEL_GAP + column * (panelWidth + PANEL_GAP),
      y: PANEL_TOP + row * (PANEL_HEIGHT + PANEL_GAP),
      width: panelWidth,
      height: PANEL_HEIGHT,
    };
  });
  const hubs: ConstellationHub[] = cfg.clusters.map((cluster, clusterIndex) => {
    const panel = panels[clusterIndex]!;
    return {
      clusterIndex,
      clusterId: cluster.id,
      name: cluster.name,
      x: panel.x + panel.width / 2,
      y: panel.y + 44,
    };
  });
  const members = memberships(cfg);
  const placed = new Map<SkillId, Point>();

  cfg.clusters.forEach((_, clusterIndex) => {
    const panel = panels[clusterIndex]!;
    const own = members.filter((member) => member.clusters.length === 1 && member.clusters[0] === clusterIndex);
    own.forEach((member, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      placed.set(member.id, {
        x: panel.x + panel.width * (column === 0 ? 0.27 : 0.73),
        y: panel.y + NODE_AREA_TOP + row * NODE_ROW_HEIGHT,
      });
    });
  });

  // A shared skill sits between its cluster hubs and links to each, while remaining a single node.
  const sharedGroups = new Map<string, Membership[]>();
  for (const s of members) {
    if (s.clusters.length < 2) continue;
    const key = s.clusters.join(",");
    sharedGroups.set(key, [...(sharedGroups.get(key) ?? []), s]);
  }
  for (const group of sharedGroups.values()) {
    const clusterIndices = group[0]!.clusters;
    const relatedHubs = clusterIndices.map((index) => hubs[index]!);
    const x = relatedHubs.reduce((sum, hub) => sum + hub.x, 0) / relatedHubs.length;
    const y = Math.max(...clusterIndices.map((index) => panels[index]!.y)) + NODE_AREA_TOP + NODE_ROW_HEIGHT * 2;
    group.forEach((member, index) => {
      placed.set(member.id, { x, y: y + index * NODE_ROW_HEIGHT });
    });
  }

  const clusterContentBottom = Math.max(panelHeight, ...[...placed.values()].map(({ y }) => y));

  // Unclustered skills trail below the cluster content in rows so they remain within the chart.
  const loose = members.filter((s) => s.clusters.length === 0);
  const looseColumns = Math.max(1, Math.floor((metrics.width - 48) / 180));
  const looseRows = Math.ceil(loose.length / looseColumns);
  const looseTop = clusterContentBottom + PANEL_GAP;
  loose.forEach((s, k) => {
    const row = Math.floor(k / looseColumns);
    const column = k % looseColumns;
    const rowCount = Math.min(looseColumns, loose.length - row * looseColumns);
    placed.set(s.id, {
      x: (metrics.width * (column + 1)) / (rowCount + 1),
      y: looseTop + row * NODE_ROW_HEIGHT,
    });
  });

  const contentBottom = Math.max(panelHeight, ...[...placed.values()].map(({ y }) => y));
  return finishLayout(
    viewport,
    "graph",
    {
      width: metrics.width,
      height: loose.length > 0
        ? looseTop + looseRows * NODE_ROW_HEIGHT
        : Math.max(panelHeight, contentBottom + PANEL_BOTTOM),
    },
    hubs,
    placed,
    members,
    cfg,
    [],
    panels,
  );
}

function lanesLayout(cfg: SkillsConfig): ConstellationLayout {
  const members = memberships(cfg);
  const placed = new Map<SkillId, Point>();
  const hubs: ConstellationHub[] = [];
  const lanes: ConstellationLane[] = [];
  let y = 0;

  const placeRows = (skills: Membership[]) => {
    for (const s of skills) {
      placed.set(s.id, { x: MOBILE.chipX, y: y + MOBILE.row / 2 });
      y += MOBILE.row;
    }
  };

  cfg.clusters.forEach((cluster, i) => {
    const own = members.filter((s) => s.clusters.length === 1 && s.clusters[0] === i);
    const top = y;
    y += MOBILE.lanePad;
    const rowsTop = y;
    placeRows(own);
    if (own.length === 0) y += MOBILE.row; // keep room for the hub chip
    const rowsBottom = y;
    y += MOBILE.lanePad;
    lanes.push({ clusterIndex: i, y: top, height: y - top });
    hubs.push({
      clusterIndex: i,
      clusterId: cluster.id,
      name: cluster.name,
      x: MOBILE.hubX,
      y: (rowsTop + rowsBottom) / 2,
    });

    // Shared skills sit on the seam right after the first lane they belong to (BigQuery between
    // the adjacent Cloud and Databases lanes).
    const seam = members.filter((s) => s.clusters.length > 1 && s.clusters[0] === i);
    if (seam.length > 0) placeRows(seam);
    else if (i < cfg.clusters.length - 1) y += MOBILE.laneGap;
  });

  // Unclustered skills (not expected in real content) trail after the last lane.
  placeRows(members.filter((s) => s.clusters.length === 0));

  return finishLayout(
    "mobile",
    "lanes",
    { width: MOBILE.width, height: Math.max(y, MOBILE.row) },
    hubs,
    placed,
    members,
    cfg,
    lanes,
    [],
  );
}

/**
 * Cluster graph geometry for the SVG renderer: one node per distinct skill id and one edge per
 * (skill, cluster) membership, so a shared skill such as BigQuery is a single node linked to every
 * hub that lists it (Req 17.3). Pure and deterministic.
 */
export function buildConstellationLayout(cfg: SkillsConfig, viewportClass: ConstellationViewport): ConstellationLayout {
  return viewportClass === "mobile" ? lanesLayout(cfg) : graphLayout(cfg, viewportClass);
}

// ---------- text listing and names (Req 17.8, 17.9) ----------

/** Shown when the selected skill is in no Case_Study tech list (Req 17.7, 17.8). */
export const NO_FEATURED_PROJECT_NOTE = "No featured project currently uses this skill.";

export interface SkillListingProject {
  id: ProjectId;
  title: string;
}

export interface SkillListingEntry {
  skillId: SkillId;
  name: string;
  /** Exactly the projects whose tech list contains the skill, in project order. */
  projects: readonly SkillListingProject[];
  /** "Used in: A, B." or `NO_FEATURED_PROJECT_NOTE`. */
  projectsText: string;
}

export interface SkillListingCluster {
  clusterIndex: number;
  clusterId: string;
  name: string;
  /** Each skill the cluster lists, once, in cluster order. */
  skills: readonly SkillListingEntry[];
}

/** Text the skill's projects render as in the listing and the "no featured project" note. */
export function projectsText(projects: readonly SkillListingProject[]): string {
  return projects.length === 0 ? NO_FEATURED_PROJECT_NOTE : `Used in: ${projects.map((p) => p.title).join(", ")}.`;
}

/**
 * Screen-reader listing that does not depend on pointer interaction: every cluster, each skill
 * under every cluster it belongs to, and for each skill its projects or a note that there are none
 * (Req 17.8).
 */
export function buildSkillTextListing(cfg: SkillsConfig, projects: readonly CaseStudy[]): SkillListingCluster[] {
  const entries = new Map<SkillId, SkillListingEntry>();
  const entryFor = (id: SkillId): SkillListingEntry => {
    let entry = entries.get(id);
    if (!entry) {
      const used = projectsUsing(id, projects).map((p) => ({ id: p.id, title: p.title }));
      entry = { skillId: id, name: skillName(id, cfg), projects: used, projectsText: projectsText(used) };
      entries.set(id, entry);
    }
    return entry;
  };
  return cfg.clusters.map((cluster, clusterIndex) => ({
    clusterIndex,
    clusterId: cluster.id,
    name: cluster.name,
    skills: [...new Set(cluster.skills)].map(entryFor),
  }));
}

/** Accessible name for a skill node: the skill name and every cluster it belongs to, e.g. "BigQuery — Cloud, Databases" (Req 17.9). */
export function skillAccessibleName(skill: SkillId, cfg: SkillsConfig): string {
  const name = skillName(skill, cfg);
  const clusterNames = [...new Set(clusterIndicesOf(skill, cfg).map((i) => cfg.clusters[i]!.name))];
  return clusterNames.length === 0 ? name : `${name} — ${clusterNames.join(", ")}`;
}
