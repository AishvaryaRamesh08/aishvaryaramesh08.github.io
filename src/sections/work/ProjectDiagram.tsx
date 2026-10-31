import { useState } from "react";
import type { WorkDiagram } from "../../data/work";
import { cx } from "../../lib/cx";

function PipelineDiagram({ diagram }: { diagram: Extract<WorkDiagram, { kind: "pipeline" }> }) {
  const width = 680;
  const height = 126;
  const nodeWidth = 112;
  const nodeHeight = 42;
  const startX = 8;
  const gap = (width - startX * 2 - nodeWidth * diagram.stages.length) / (diagram.stages.length - 1);
  const y = 42;

  return (
    <figure className="m-0 rounded-lg border border-border bg-surface-2/50 p-3">
      <svg
        role="img"
        aria-labelledby="pipeline-diagram-title pipeline-diagram-description"
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
      >
        <title id="pipeline-diagram-title">{diagram.title}</title>
        <desc id="pipeline-diagram-description">{diagram.description}</desc>
        <defs>
          <marker id="pipeline-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0 0 7 3.5 0 7z" className="fill-accent-cyan-text" />
          </marker>
        </defs>
        {diagram.stages.slice(0, -1).map((stage, index) => {
          const x1 = startX + nodeWidth + gap * index + nodeWidth * index;
          const x2 = startX + gap * (index + 1) + nodeWidth * (index + 1);
          return (
            <path
              key={`${stage}-flow`}
              d={`M${x1 + 3} ${y + nodeHeight / 2} H${x2 - 7}`}
              className="stroke-accent-cyan-text"
              strokeWidth="1.5"
              markerEnd="url(#pipeline-arrow)"
            />
          );
        })}
        {diagram.stages.map((stage, index) => {
          const x = startX + index * (nodeWidth + gap);
          return (
            <g key={stage}>
              <rect
                x={x}
                y={y}
                width={nodeWidth}
                height={nodeHeight}
                rx="8"
                className="fill-surface stroke-border-strong"
              />
              <text
                x={x + nodeWidth / 2}
                y={y + 26}
                textAnchor="middle"
                className="fill-text font-mono text-[11px]"
              >
                {stage}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function DependencyDiagram({ diagram }: { diagram: Extract<WorkDiagram, { kind: "dependency" }> }) {
  const [failedJobId, setFailedJobId] = useState(diagram.failedJobId);
  const nodeWidth = 124;
  const nodeHeight = 42;
  const downstream = new Set<string>();
  const queue = [failedJobId];

  while (queue.length) {
    const source = queue.shift();
    if (!source) continue;
    for (const edge of diagram.edges) {
      if (edge.from === source && !downstream.has(edge.to) && edge.to !== failedJobId) {
        downstream.add(edge.to);
        queue.push(edge.to);
      }
    }
  }

  const nodeById = new Map(diagram.jobs.map((job) => [job.id, job]));

  return (
    <figure className="m-0 rounded-lg border border-border bg-surface-2/50 p-3">
      <svg
        role="group"
        aria-labelledby="dependency-diagram-title dependency-diagram-description"
        viewBox="0 0 760 194"
        className="h-auto w-full"
      >
        <title id="dependency-diagram-title">{diagram.title}</title>
        <desc id="dependency-diagram-description">{diagram.description}</desc>
        <defs>
          <marker id="dependency-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0 0 7 3.5 0 7z" className="fill-border-strong" />
          </marker>
          <marker id="dependency-arrow-active" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0 0 7 3.5 0 7z" className="fill-accent-cyan-text" />
          </marker>
        </defs>
        {diagram.edges.map((edge) => {
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          if (!from || !to) return null;
          const highlighted =
            (edge.from === failedJobId || downstream.has(edge.from)) &&
            (edge.to === failedJobId || downstream.has(edge.to));
          const startX = from.x + nodeWidth;
          const startY = from.y + nodeHeight / 2;
          const endX = to.x - 7;
          const endY = to.y + nodeHeight / 2;
          const bendX = startX + (endX - startX) / 2;
          return (
            <path
              key={`${edge.from}-${edge.to}`}
              d={`M${startX} ${startY} H${bendX} V${endY} H${endX}`}
              fill="none"
              className={highlighted ? "stroke-accent-cyan-text" : "stroke-border-strong"}
              strokeWidth={highlighted ? "2" : "1.5"}
              markerEnd={highlighted ? "url(#dependency-arrow-active)" : "url(#dependency-arrow)"}
            />
          );
        })}
        {diagram.jobs.map((job) => {
          const failed = job.id === failedJobId;
          const impacted = downstream.has(job.id);
          const status = failed ? diagram.failedLabel : impacted ? diagram.downstreamLabel : "";
          return (
            <g
              key={job.id}
              role="button"
              tabIndex={0}
              aria-label={`${job.label}${status ? `, ${status}` : ""}. ${diagram.interactionHint}`}
              onFocus={() => setFailedJobId(job.id)}
              onClick={() => setFailedJobId(job.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setFailedJobId(job.id);
                }
              }}
              className="cursor-pointer"
            >
              <rect
                x={job.x}
                y={job.y}
                width={nodeWidth}
                height={nodeHeight}
                rx="7"
                className={cx(
                  "stroke-2 transition-colors",
                  failed && "fill-status-danger/15 stroke-status-danger",
                  !failed && impacted && "fill-accent-cyan/15 stroke-accent-cyan-text",
                  !failed && !impacted && "fill-surface stroke-border-strong",
                )}
              />
              <text
                x={job.x + nodeWidth / 2}
                y={job.y + (failed ? 17 : 25)}
                textAnchor="middle"
                className="fill-text font-mono text-[10px]"
              >
                {job.label}
              </text>
              {failed ? (
                <text
                  x={job.x + nodeWidth / 2}
                  y={job.y + 33}
                  textAnchor="middle"
                  className="fill-status-danger font-mono text-[8px] font-bold"
                >
                  {diagram.failedLabel.toUpperCase()}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-xs text-text-muted">
        {diagram.caption}. {diagram.interactionHint}
      </figcaption>
    </figure>
  );
}

export function ProjectDiagram({ diagram }: { diagram: WorkDiagram }) {
  return diagram.kind === "pipeline" ? (
    <PipelineDiagram diagram={diagram} />
  ) : (
    <DependencyDiagram diagram={diagram} />
  );
}
