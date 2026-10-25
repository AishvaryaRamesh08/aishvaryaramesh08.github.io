// A single Featured_Work Case_Study (Req 12.2, 12.6-12.9). The card is a `GlassCard` whose header
// is a `Disclosure` button; activating it expands the inline `CaseStudyPanel` below, collapsing any
// other card (the disclosure group keeps at most one open — Req 12.2). Because `Disclosure` is a
// native button that never moves focus, collapsing leaves focus on the card button (Req 12.6).
//
// The panel shows exactly five headed subsections in order — Challenge, Approach, Architecture
// diagram, Outcome, Tech (Req 12.2). The architecture diagram is an SVG with a text alternative
// naming every component and the data-flow direction (Req 12.8), or a `PlaceholderAsset` while the
// Owner has not supplied it, with the other four subsections still rendered (Req 12.9). The
// "work in progress" badge appears on the card and in the panel (Req 12.7).
//
// SSR-safe: the panel stays mounted (hidden) so `aria-controls` always resolves and the server and
// first client render match.
import { useId, type ReactNode } from "react";
import { Badge } from "../../components/Chip";
import { Disclosure, DisclosurePanel } from "../../components/Disclosure";
import { FixedImage } from "../../components/FixedImage";
import { GlassCard } from "../../components/GlassCard";
import { PlaceholderAsset } from "../../components/PlaceholderAsset";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import { skills } from "../../data/skills";
import type { CaseStudy, SkillId } from "../../data/types";
import { isPlaceholder } from "../../data/types";
import { cx } from "../../lib/cx";
import { TechChips } from "./TechChips";
import { architectureAltText } from "./architectureAltText";
import { workCopy } from "./copy";

/** Human-readable label for a tech id, from `skills.ts`; falls back to the id if unlisted. */
const skillName = (() => {
  const byId = new Map<SkillId, string>(skills.skills.map((s) => [s.id, s.name]));
  return (id: SkillId): string => byId.get(id) ?? id;
})();

export interface CaseStudyCardProps {
  project: CaseStudy;
  /** Whether this card's panel is expanded (driven by the disclosure group in `FeaturedWork`). */
  expanded: boolean;
  /** Toggle this card (expand it, collapsing any other, or collapse it if already open). */
  onToggle: () => void;
  /**
   * Content rendered inside the panel for a Case_Study that links a demo (`project.demo`).
   * Task 12.4 leaves this empty for the Autosys card (a labelled placeholder shows instead);
   * task 12.6 passes the `DependencyDemo` here. Ignored when `project.demo` is undefined.
   */
  demoSlot?: ReactNode;
}

/** One heading + body subsection in the expanded panel. */
function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="font-heading text-sm font-semibold tracking-wide text-text-muted uppercase">{title}</h4>
      {children}
    </section>
  );
}

/** A `Slot<string>` body: the real text, or a labelled placeholder in its place (Req 4.5). */
function SlotText({ value }: { value: CaseStudy["challenge"] }) {
  if (isPlaceholder(value)) return <PlaceholderAsset expected={value.expected} variant="text" />;
  return <p className="max-w-prose text-pretty text-text">{value}</p>;
}

/**
 * The Architecture diagram subsection body: the SVG with its generated text alternative (Req 12.8),
 * or a `PlaceholderAsset` in the declared box while the Owner has not supplied it (Req 12.9).
 */
function ArchitectureBody({ project }: { project: CaseStudy }) {
  const diagram = project.architecture;
  if (isPlaceholder(diagram)) {
    return (
      <PlaceholderAsset
        variant="image"
        expected={diagram.expected}
        width={diagram.width}
        height={diagram.height}
      />
    );
  }
  // Real diagram: an SVG whose alt names every component and the direction of data flow (Req 12.8).
  return (
    <FixedImage
      image={{
        src: diagram.src,
        width: diagram.width,
        height: diagram.height,
        alt: architectureAltText(diagram.components, diagram.flow),
      }}
      fill
    />
  );
}

export function CaseStudyCard({ project, expanded, onToggle, demoSlot }: CaseStudyCardProps) {
  const headingId = useId();
  const panelId = `${headingId}-panel`;
  const wip = project.workInProgress === true;

  return (
    <GlassCard
      as="li"
      glow={expanded}
      className={cx(
        "flex flex-col overflow-hidden transition-colors",
        // Span the full grid row when expanded so the panel sits below the card (Req 12.2).
        expanded && "md:col-span-full",
      )}
    >
      <Disclosure
        expanded={expanded}
        controls={panelId}
        onToggle={onToggle}
        className="flex w-full flex-col items-start gap-2 p-5 text-left"
      >
        <span className="flex w-full flex-wrap items-center gap-2">
          <span id={headingId} className="font-heading text-lg font-semibold text-text">
            {project.title}
          </span>
          {project.org ? <span className="text-sm text-text-muted">· {project.org}</span> : null}
        </span>

        <span className="flex flex-wrap items-center gap-2">
          {project.award ? (
            <Badge tone="cyan">
              {workCopy.awardLabel}: {project.award}
            </Badge>
          ) : null}
          {wip ? <Badge tone="violet">{workCopy.workInProgress}</Badge> : null}
        </span>

        <span className="text-sm text-pretty text-text-muted">{project.summary}</span>

        <VisuallyHidden>{expanded ? workCopy.collapseHint : workCopy.expandHint}</VisuallyHidden>
      </Disclosure>

      <DisclosurePanel
        id={panelId}
        expanded={expanded}
        as="section"
        aria-labelledby={headingId}
        className="flex flex-col gap-6 border-t border-border px-5 pt-5 pb-6"
      >
        {/* The badge also appears in the expanded view (Req 12.7). */}
        {wip ? (
          <p className="m-0">
            <Badge tone="violet">{workCopy.workInProgress}</Badge>
          </p>
        ) : null}

        {/* Exactly five subsections, in order (Req 12.2). */}
        <Subsection title={workCopy.subsections.challenge}>
          <SlotText value={project.challenge} />
        </Subsection>

        <Subsection title={workCopy.subsections.approach}>
          <SlotText value={project.approach} />
        </Subsection>

        <Subsection title={workCopy.subsections.architecture}>
          <ArchitectureBody project={project} />
          {/* Demo slot: the Autosys card links the Dependency_Demo (filled by task 12.6). Until
              then a labelled placeholder marks where the interactive demo will live (Req 4.5). */}
          {project.demo ? (
            <div data-demo-slot={project.demo}>
              {demoSlot ?? <PlaceholderAsset expected="interactive dependency demo" variant="image" width={640} height={360} />}
            </div>
          ) : null}
        </Subsection>

        <Subsection title={workCopy.subsections.outcome}>
          <SlotText value={project.outcome} />
        </Subsection>

        <Subsection title={workCopy.subsections.tech}>
          <TechChips
            labels={project.tech.map(skillName)}
            animate={expanded}
            aria-label={workCopy.techListLabel}
          />
        </Subsection>
      </DisclosurePanel>
    </GlassCard>
  );
}

/** Re-exported so the tech-chip rendering can be shared/tested; the card uses it above. */
export { architectureAltText };
