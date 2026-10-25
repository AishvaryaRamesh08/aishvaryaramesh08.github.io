// Skill_Constellation (Req 17): an interactive node map of skills grouped into labelled clusters.
//
// Desktop and tablet render a connected cluster chart; a Mobile_Viewport renders the same
// skills as stacked cluster lanes with 44 px chips (Req 17.1, 17.2). Every skill is a single
// keyboard-focusable control (Req 17.3, 17.9) whose accessible name carries its cluster names, and
// BigQuery is one node linked to both the Cloud and Databases hubs (Req 17.3).
//
// Hovering (Desktop_Viewport), tapping or focusing a skill highlights it, its related skills and
// the Case_Studies that use it, and de-emphasises everything else (Req 17.4); the highlight clears
// on pointer-leave, blur, Escape or an outside tap (Req 17.5). The relationships themselves come
// from the pure helpers in `lib/skills.ts`, so the section only maps geometry and state to DOM.
//
// The map never carries information that pointer users alone can reach: an always-rendered,
// screen-reader-reachable text listing names every cluster, each skill under it, and that skill's
// projects or a note that there are none (Req 17.7, 17.8). All of this is SSR-safe — the server
// renders the desktop graph branch and the listing, and `useMediaQuery` only switches viewport
// class after hydration (so the markup never mismatches). Reduced motion keeps the nodes static.
import { useMemo, useRef, useState } from "react";
import { cx } from "../../lib/cx";
import {
  buildConstellationLayout,
  buildSkillTextListing,
  computeHighlight,
  skillAccessibleName,
  type ConstellationLayout,
  type ConstellationNode,
  type SkillHighlight,
} from "../../lib/skills";
import type { SkillId } from "../../data/types";
import { skills } from "../../data/skills";
import { projects } from "../../data/projects";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useEscapeKey, useOutsideTap } from "../../hooks/useDismiss";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import { GlassCard } from "../../components/GlassCard";
import { skillsCopy } from "./copy";

/** A Mobile_Viewport (stacked lanes) is below 768 px. */
const MOBILE_QUERY = "(max-width: 767.98px)";
/** Tablet is 768–1023 px; from 1024 px up it is the desktop graph. */
const TABLET_QUERY = "(max-width: 1023.98px)";

type ViewportClass = ConstellationLayout["viewport"];

/** Live viewport class for the layout. SSR and hydration render the desktop branch (Req 3.3). */
function useViewportClass(): ViewportClass {
  const mobile = useMediaQuery(MOBILE_QUERY);
  const tablet = useMediaQuery(TABLET_QUERY);
  if (mobile) return "mobile";
  if (tablet) return "tablet";
  return "desktop";
}

/** Emphasis of a node given the current highlight: the selected node, a related node, or dimmed. */
function emphasisOf(skillId: SkillId, highlight: SkillHighlight | null): "selected" | "related" | "dim" | "none" {
  if (!highlight) return "none";
  if (highlight.selected === skillId) return "selected";
  if (highlight.related.has(skillId)) return "related";
  return "dim";
}

const nodeToneClass: Record<"selected" | "related" | "dim" | "none", string> = {
  selected: "border-cyan-700 bg-cyan-100 text-cyan-950 shadow-glow-cyan",
  related: "border-violet-600 bg-violet-100 text-violet-950",
  dim: "border-slate-300 bg-white text-slate-600 opacity-40",
  none: "border-slate-400 bg-white text-slate-950",
};

interface SkillNodeButtonProps {
  node: ConstellationNode;
  emphasis: "selected" | "related" | "dim" | "none";
  /** True on a Mobile_Viewport, where chips are full 44 px tall controls in a lane (Req 27.2). */
  mobile: boolean;
  onSelect: (skill: SkillId) => void;
  onClear: () => void;
  /** Hover highlights only on a Desktop_Viewport (Req 17.4). */
  hoverEnabled: boolean;
}

/** One skill as a focusable control; its accessible name carries the skill and its clusters (Req 17.9). */
function SkillNodeButton({ node, emphasis, mobile, onSelect, onClear, hoverEnabled }: SkillNodeButtonProps) {
  return (
    <button
      type="button"
      data-skill-node={node.skillId}
      aria-label={skillAccessibleName(node.skillId, skills)}
      onFocus={() => onSelect(node.skillId)}
      onBlur={onClear}
      onClick={() => onSelect(node.skillId)}
      onPointerEnter={hoverEnabled ? () => onSelect(node.skillId) : undefined}
      onPointerLeave={hoverEnabled ? onClear : undefined}
      className={cx(
        "pointer-events-auto inline-flex items-center justify-center rounded-pill border font-mono whitespace-nowrap transition-colors duration-150",
        mobile ? "min-h-11 px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
        nodeToneClass[emphasis],
      )}
    >
      {node.name}
      {node.shared ? <span aria-hidden="true" className="ml-1 text-[0.625rem] opacity-70">★</span> : null}
    </button>
  );
}

interface NetworkMapProps {
  layout: ConstellationLayout;
  highlight: SkillHighlight | null;
  onSelect: (skill: SkillId) => void;
  onClear: () => void;
  hoverEnabled: boolean;
}

/**
 * Desktop/tablet graph: an SVG draws the cluster panels, hubs and one edge per (skill, cluster)
 * membership, and HTML buttons are overlaid at each node's coordinate (percentages of the viewBox)
 * so the controls keep native keyboard focus and accessible names.
 */
function NetworkMap({ layout, highlight, onSelect, onClear, hoverEnabled }: NetworkMapProps) {
  const { width, height } = layout;
  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        {layout.panels.map((panel) => (
          <rect
            key={panel.clusterIndex}
            x={panel.x}
            y={panel.y}
            width={panel.width}
            height={panel.height}
            rx={16}
            className="fill-white stroke-slate-200"
          />
        ))}
        {/* One line per membership, from the skill node to the cluster hub (Req 17.3). */}
        {layout.edges.map((edge) => {
          const selected = highlight?.selected === edge.skillId;
          const related = highlight?.related.has(edge.skillId);
          return (
            <line
              key={edge.id}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              className={cx(
                "stroke-slate-400 transition-opacity duration-150",
                highlight && !selected && !related && "opacity-20",
                selected && "stroke-cyan-700",
              )}
              strokeWidth={selected ? 2 : 1}
            />
          );
        })}
        {/* Cluster hubs, each labelled with its cluster name (Req 17.1). */}
        {layout.hubs.map((hub) => (
          <g key={hub.clusterId}>
            <circle cx={hub.x} cy={hub.y} r={8} className="fill-cyan-700" />
            <text
              x={hub.x}
              y={hub.y - 16}
              textAnchor="middle"
              className="fill-slate-950 font-heading text-[18px] font-semibold"
            >
              {hub.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Skill controls overlaid at each node coordinate. */}
      {layout.nodes.map((node) => (
        <div
          key={node.skillId}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(node.x / width) * 100}%`, top: `${(node.y / height) * 100}%` }}
        >
          <SkillNodeButton
            node={node}
            emphasis={emphasisOf(node.skillId, highlight)}
            mobile={false}
            onSelect={onSelect}
            onClear={onClear}
            hoverEnabled={hoverEnabled}
          />
        </div>
      ))}
    </div>
  );
}

interface MobileLanesProps {
  layout: ConstellationLayout;
  highlight: SkillHighlight | null;
  onSelect: (skill: SkillId) => void;
  onClear: () => void;
}

/** Mobile_Viewport: one stacked lane per cluster, each labelled, with 44 px skill chips (Req 17.1, 17.2). */
function MobileLanes({ layout, highlight, onSelect, onClear }: MobileLanesProps) {
  // Group the laid-out nodes by the clusters they belong to; a shared skill appears in each lane.
  const nodesByCluster = useMemo(() => {
    const map = new Map<number, ConstellationNode[]>();
    for (const hub of layout.hubs) map.set(hub.clusterIndex, []);
    for (const node of layout.nodes) {
      if (node.clusterIndices.length === 0) continue;
      for (const clusterIndex of node.clusterIndices) map.get(clusterIndex)?.push(node);
    }
    return map;
  }, [layout]);

  return (
    <ul className="flex list-none flex-col gap-4 p-0">
      {layout.hubs.map((hub) => (
        <li key={hub.clusterId}>
          <GlassCard className="flex flex-col gap-3 p-4">
            <h3 className="font-heading text-sm font-semibold text-text">{hub.name}</h3>
            <div className="flex flex-wrap gap-2">
              {(nodesByCluster.get(hub.clusterIndex) ?? []).map((node) => (
                <SkillNodeButton
                  key={`${hub.clusterIndex}:${node.skillId}`}
                  node={node}
                  emphasis={emphasisOf(node.skillId, highlight)}
                  mobile
                  onSelect={onSelect}
                  onClear={onClear}
                  hoverEnabled={false}
                />
              ))}
            </div>
          </GlassCard>
        </li>
      ))}
    </ul>
  );
}

interface SelectionPanelProps {
  highlight: SkillHighlight | null;
}

/**
 * Visible side panel reflecting the current highlight: the related skills and the Case_Study
 * titles that used the selected skill, or the "no featured project" note when none do (Req 17.4,
 * 17.7). This is a convenience view; the sr-only listing below carries the complete information.
 */
function SelectionPanel({ highlight }: SelectionPanelProps) {
  if (!highlight) {
    return <p className="text-sm text-text-muted">{skillsCopy.idlePrompt}</p>;
  }
  const relatedNames = [...highlight.related].map((id) => skills.skills.find((s) => s.id === id)?.name ?? id);
  const selectedProjects = projects.filter((p) => highlight.projects.has(p.id));
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <div>
        <p className="font-heading text-sm font-semibold text-text">{skillsCopy.relatedHeading}</p>
        <p className="mt-1 text-sm text-text-muted">
          {relatedNames.length > 0 ? relatedNames.join(", ") : "—"}
        </p>
      </div>
      <div>
        <p className="font-heading text-sm font-semibold text-text">{skillsCopy.projectsHeading}</p>
        {selectedProjects.length > 0 ? (
          <ul className="mt-1 flex list-none flex-col gap-1 p-0">
            {selectedProjects.map((project) => (
              <li key={project.id} className="text-sm text-accent-cyan-text">
                {project.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-text-muted">No featured project currently uses this skill.</p>
        )}
      </div>
    </div>
  );
}

/** Always-present, screen-reader-reachable listing; never depends on pointer interaction (Req 17.8). */
function SkillTextListing() {
  const listing = useMemo(() => buildSkillTextListing(skills, projects), []);
  return (
    <VisuallyHidden as="div">
      <h3>{skillsCopy.listingHeading}</h3>
      <ul>
        {listing.map((cluster) => (
          <li key={cluster.clusterId}>
            {cluster.name}
            <ul>
              {cluster.skills.map((entry) => (
                <li key={entry.skillId}>
                  {entry.name}. {entry.projectsText}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </VisuallyHidden>
  );
}

/** Skill_Constellation body. The heading and anchor come from `SectionShell` (Req 3.2, 3.3). */
export default function SkillConstellation() {
  const viewportClass = useViewportClass();
  const [highlight, setHighlight] = useState<SkillHighlight | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => buildConstellationLayout(skills, viewportClass), [viewportClass]);

  const onSelect = (skill: SkillId) => setHighlight(computeHighlight(skill, skills, projects));
  const onClear = () => setHighlight(null);

  // Escape or a tap outside any skill node clears the highlight (Req 17.5).
  useEscapeKey(onClear, highlight !== null);
  useOutsideTap(mapRef, onClear, highlight !== null);

  return (
    <div data-section-body="skills" className="flex flex-col gap-6">
      <p className="max-w-prose text-text-muted">{skillsCopy.intro}</p>

      <div className="grid grid-cols-1 gap-6">
        <div ref={mapRef}>
          {viewportClass === "mobile" ? (
            <MobileLanes layout={layout} highlight={highlight} onSelect={onSelect} onClear={onClear} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50 p-3 shadow-sm sm:p-5">
              <NetworkMap
                layout={layout}
                highlight={highlight}
                onSelect={onSelect}
                onClear={onClear}
                hoverEnabled={viewportClass === "desktop"}
              />
            </div>
          )}
        </div>

        <aside aria-label={skillsCopy.projectsHeading} className="rounded-xl border border-slate-300 bg-white p-4">
          <SelectionPanel highlight={highlight} />
        </aside>
      </div>

      <SkillTextListing />
    </div>
  );
}
