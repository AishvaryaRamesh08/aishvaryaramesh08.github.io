// Pipeline_Diagram (Req 11): "How I Think About Data". Six Disclosure stage nodes in Source →
// Raw → Staging → Sanitized → Conformed → Insights / AI order, laid out as a row from 768 px and
// a column on a Mobile_Viewport, with at most one stage expanded and active at a time (all
// collapsed on first render, Req 11.1). The active node gets a glow (Req 11.6) via the
// `aria-expanded:shadow-glow-cyan` state variant — a token shadow utility, not the allowlisted
// `glow-border`, so build/glassAllowlist.test.ts stays green. Connectors are SVG arrows pointing
// toward Insights / AI with a CSS-animated particle; reduced motion drops the particle animation
// (handled globally by `html[data-motion="reduced"] * { animation: none }`), leaving the static
// arrowheads and instant expand/collapse (Req 11.5, 11.10). A visually hidden listing names the
// stages and their flow for assistive tech, and the grounding note is visible text (Req 11.7).
import { Fragment, type ReactNode } from "react";
import { Disclosure, DisclosurePanel, useDisclosureGroup } from "../../components/Disclosure";
import { PlaceholderAsset } from "../../components/PlaceholderAsset";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import { pipeline } from "../../data/pipeline";
import { isPlaceholder } from "../../data/types";

/** Stable element IDs for each stage's trigger/panel pair, derived from the config id. */
const nodeId = (id: string): string => `pipeline-stage-${id}`;
const panelId = (id: string): string => `pipeline-panel-${id}`;

/** Human-readable flow description for the text alternative (Req 11.8). */
const flowText = pipeline.stages.map((stage) => stage.name).join(" → ");

/** A single SVG connector with a static arrowhead and one CSS-animated flow particle (Req 11.5). */
function Connector({ orientation }: { orientation: "row" | "column" }) {
  const horizontal = orientation === "row";
  return (
    <span
      aria-hidden="true"
      className={horizontal ? "hidden shrink-0 items-center md:flex" : "flex justify-center py-1 md:hidden"}
    >
      <svg
        viewBox="0 0 48 24"
        width="48"
        height="24"
        fill="none"
        className={horizontal ? "h-6 w-12 text-accent-cyan" : "h-6 w-12 rotate-90 text-accent-cyan"}
        role="presentation"
      >
        {/* Shaft + static arrowhead: the always-present directional cue (Req 11.10). */}
        <path d="M2 12 H40" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <path
          d="M34 6 L42 12 L34 18"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Flow particle: animated only with motion on (reduced motion strips the animation). */}
        <circle className="pipeline-flow-dot" cx="0" cy="12" r="2.5" fill="currentColor" />
      </svg>
    </span>
  );
}

/** One pipeline stage: a Disclosure trigger plus its explanation panel (or a placeholder). */
function StageNode({
  id,
  name,
  explanation,
  expanded,
  onToggle,
}: {
  id: string;
  name: string;
  explanation: ReactNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex w-full flex-col md:w-auto md:min-w-0 md:flex-1">
      <Disclosure
        id={nodeId(id)}
        expanded={expanded}
        controls={panelId(id)}
        onToggle={onToggle}
        className="w-full rounded-card border border-border-strong bg-surface px-4 py-3 text-center font-heading text-sm font-semibold text-text transition-shadow hover:border-accent-cyan focus-visible:border-accent-cyan aria-expanded:border-accent-cyan aria-expanded:shadow-glow-cyan"
      >
        {name}
      </Disclosure>
      <DisclosurePanel
        id={panelId(id)}
        expanded={expanded}
        className="mt-2 rounded-md border border-border bg-surface-2 p-3 text-sm leading-relaxed text-text-muted"
      >
        {explanation}
      </DisclosurePanel>
    </li>
  );
}

/** Pipeline_Diagram body. The heading and anchor come from `SectionShell` (Req 3.2, 3.3). */
export default function PipelineDiagram() {
  const group = useDisclosureGroup();

  return (
    <div data-section-body="pipeline" className="flex flex-col gap-6">
      {/* Text alternative: the full stage order and flow for assistive tech (Req 11.8). */}
      <VisuallyHidden>
        Data pipeline with six stages in order: {flowText}. Activate a stage to read how I handle
        it.
      </VisuallyHidden>

      {/* Stages: a horizontal row from 768 px, a vertical column on a Mobile_Viewport (Req 11.1,
          11.2). `flex-wrap`/`min-w-0` keep long names from forcing horizontal page scroll. */}
      <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-start">
        {pipeline.stages.map((stage, index) => {
          const explanation = isPlaceholder(stage.explanation) ? (
            <PlaceholderAsset expected={stage.explanation.expected} />
          ) : (
            stage.explanation
          );
          return (
            <Fragment key={stage.id}>
              <StageNode
                id={stage.id}
                name={stage.name}
                explanation={explanation}
                expanded={group.isExpanded(stage.id)}
                onToggle={() => group.toggle(stage.id)}
              />
              {index < pipeline.stages.length - 1 ? (
                <>
                  <Connector orientation="row" />
                  <Connector orientation="column" />
                </>
              ) : null}
            </Fragment>
          );
        })}
      </ol>

      {/* Grounding note: visible text tying the diagram to real work (Req 11.7). */}
      <p className="text-sm text-text-muted">{pipeline.groundingNote}</p>

      {/* CSS flow particle for the connectors (Req 11.5). Scoped to this section; reduced motion
          disables it via the global `html[data-motion="reduced"] *` animation reset (Req 11.10). */}
      <style>{`
        @keyframes pipeline-flow {
          from { transform: translateX(2px); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          to { transform: translateX(40px); opacity: 0; }
        }
        .pipeline-flow-dot {
          animation: pipeline-flow 1.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
