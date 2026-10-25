// Interactive Autosys Dependency_Demo (Req 13.3–13.7), embedded in the GenAI Autosys Case_Study
// via the `demoSlot` of `CaseStudyCard`. It renders a small directed dependency graph of fictional
// jobs (names from `dependencyDemo.ts`, Req 31.3): activating a job marks it as the single failed
// job and highlights every job reachable downstream; activating the failed job or the Reset control
// clears the state (Req 13.3, 13.5). A legend and an `aria-live` text description keep the state
// non-color-only (Req 13.6, 13.7).
//
// Rendering choice: this demo renders INLINE (no lazy chunk, no D3). The graph is tiny and fixed, so
// a deterministic, pure layout (`dependencyLayout.ts`) places the nodes — this keeps first paint
// cheap, avoids a force simulation's non-determinism, and is SSR-safe (the server and the first
// client render produce identical SVG). The failure/reachability logic lives in the already
// property-tested `dependencyReducer`/`downstream` (src/lib/graph.ts), so the substance of Req 13 is
// shared and verifiable. The task note explicitly allows inline for a demo this small.
import { useMemo, useReducer, type KeyboardEvent } from "react";
import { LiveRegion } from "../../components/LiveRegion";
import { dependencyDemo } from "../../data/dependencyDemo";
import type { JobId } from "../../data/types";
import { dependencyReducer, initialDependencyState } from "../../lib/graph";
import { cx } from "../../lib/cx";
import { layoutGraph } from "./dependencyLayout";
import { workCopy } from "./copy";

const NODE_RX = 54;
const NODE_RY = 22;
/** Keyboard keys that activate a node, matching a native button (Req 13.3). */
const ACTIVATION_KEYS = new Set([" ", "Enter", "Spacebar"]);

type NodeState = "failed" | "downstream" | "idle";

/** Builds the readable impact description for the current state (Req 13.6, 13.7). */
function statusText(
  failed: JobId | null,
  labelOf: (id: JobId) => string,
  impacted: readonly JobId[],
): string {
  const { demo } = workCopy;
  if (failed === null) return demo.idleStatus;
  const failedLabel = labelOf(failed);
  if (impacted.length === 0) return demo.zeroDownstream(failedLabel);
  return demo.failureStatus(failedLabel, impacted.map(labelOf));
}

export interface DependencyDemoProps {
  className?: string;
}

export function DependencyDemo({ className }: DependencyDemoProps) {
  const { jobs, edges } = dependencyDemo;
  const { demo } = workCopy;

  const [state, dispatch] = useReducer(dependencyReducer, edges, initialDependencyState);

  const layout = useMemo(() => layoutGraph(jobs, edges), [jobs, edges]);
  const labelOf = useMemo(() => {
    const byId = new Map<JobId, string>(jobs.map((j) => [j.id, j.label]));
    return (id: JobId) => byId.get(id) ?? id;
  }, [jobs]);

  // Impacted jobs in the graph's content order, so the text list reads predictably (Req 13.6).
  const impacted = useMemo(
    () => jobs.map((j) => j.id).filter((id) => state.highlighted.has(id)),
    [jobs, state.highlighted],
  );

  const status = statusText(state.failed, labelOf, impacted);

  const nodeStateOf = (id: JobId): NodeState =>
    id === state.failed ? "failed" : state.highlighted.has(id) ? "downstream" : "idle";

  const activate = (id: JobId) => dispatch({ type: "activate", node: id });
  const onNodeKeyDown = (event: KeyboardEvent<SVGGElement>, id: JobId) => {
    if (!ACTIVATION_KEYS.has(event.key)) return;
    event.preventDefault();
    activate(id);
  };

  return (
    <section
      aria-label={demo.regionLabel}
      className={cx("flex flex-col gap-4", className)}
      data-dependency-demo
    >
      <p className="max-w-prose text-sm text-text-muted">{demo.instructions}</p>

      <div className="flex flex-wrap items-center gap-4">
        <Legend />
        <button
          type="button"
          onClick={() => dispatch({ type: "reset" })}
          disabled={state.failed === null}
          className="min-h-11 rounded-pill border border-border px-4 text-sm text-text transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {demo.reset}
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          role="group"
          aria-label={demo.graphLabel}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          className="h-auto w-full max-w-full min-w-[320px]"
        >
          <defs>
            <marker
              id="dependency-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-border-strong" />
            </marker>
          </defs>

          {/* Directed edges first, so nodes paint on top. */}
          <g aria-hidden="true">
            {layout.links.map(({ from, to }, index) => {
              const { x1, y1, x2, y2 } = edgeEndpoints(from, to);
              return (
                <line
                  key={`${from.id}-${to.id}-${index}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className="stroke-border-strong"
                  strokeWidth={1.5}
                  markerEnd="url(#dependency-arrow)"
                />
              );
            })}
          </g>

          {layout.nodes.map((node) => {
            const ns = nodeStateOf(node.id);
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-pressed={ns === "failed"}
                aria-label={nodeAccessibleName(node.label, ns, demo)}
                onClick={() => activate(node.id)}
                onKeyDown={(event) => onNodeKeyDown(event, node.id)}
                className="cursor-pointer outline-none"
                data-node-state={ns}
              >
                {/* Transparent hit target ≥ 44px tall/wide for pointer and touch (Req 28.11). */}
                <rect
                  x={node.x - NODE_RX}
                  y={node.y - Math.max(NODE_RY, 22)}
                  width={NODE_RX * 2}
                  height={Math.max(NODE_RY, 22) * 2}
                  fill="transparent"
                />
                <ellipse
                  cx={node.x}
                  cy={node.y}
                  rx={NODE_RX}
                  ry={NODE_RY}
                  className={cx(
                    "transition-colors",
                    ns === "failed"
                      ? "fill-surface-2 stroke-red-400"
                      : ns === "downstream"
                        ? "fill-surface-2 stroke-amber-400"
                        : "fill-surface stroke-border",
                  )}
                  strokeWidth={ns === "idle" ? 1.5 : 2.5}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none fill-text font-mono text-[10px]"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Visible + announced impact description, so the state is never conveyed by color alone. */}
      <div className="flex flex-col gap-1">
        <h5 className="font-heading text-xs font-semibold tracking-wide text-text-muted uppercase">
          {demo.statusHeading}
        </h5>
        <LiveRegion message={status} politeness="polite" visible />
      </div>
    </section>
  );
}

/** Legend entry swatch + label. */
function Legend() {
  const { demo } = workCopy;
  const items: { label: string; swatch: string }[] = [
    { label: demo.legendFailed, swatch: "border-red-400 bg-surface-2" },
    { label: demo.legendDownstream, swatch: "border-amber-400 bg-surface-2" },
    { label: demo.legendIdle, swatch: "border-border bg-surface" },
  ];
  return (
    <ul className="m-0 flex flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-text-muted">
      {items.map((item) => (
        <li key={item.label} className="flex list-none items-center gap-1.5">
          <span aria-hidden="true" className={cx("inline-block h-3 w-4 rounded-full border-2", item.swatch)} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Accessible name for a node that encodes its state in text (not color) for Req 13.6. */
function nodeAccessibleName(label: string, ns: NodeState, demo: typeof workCopy.demo): string {
  const suffix =
    ns === "failed" ? ` (${demo.legendFailed})` : ns === "downstream" ? ` (${demo.legendDownstream})` : "";
  return `${label}${suffix}`;
}

/** Trims a straight edge so its arrowhead stops at the target node's ellipse edge. */
function edgeEndpoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  // Approximate the ellipse edge by trimming a fixed inset along the line on both ends.
  const startInset = NODE_RX * 0.9;
  const endInset = NODE_RX * 0.95;
  return {
    x1: from.x + ux * startInset,
    y1: from.y + uy * (startInset * (NODE_RY / NODE_RX)),
    x2: to.x - ux * endInset,
    y2: to.y - uy * (endInset * (NODE_RY / NODE_RX)),
  };
}

export default DependencyDemo;
