import { Fragment, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { rawToReady } from "../../data/rawToReady";
import type { RawToReadyField } from "../../data/types";
import { cx } from "../../lib/cx";

type PanelId = "raw" | "clean" | "ready";

const panelIds: readonly PanelId[] = ["raw", "clean", "ready"];
const fields: readonly RawToReadyField[] = ["order_id", "customer_id", "order_date", "amount", "status"];
const cleanRows = rawToReady.rawRows.flatMap((row) => (row.clean ? [row.clean] : []));

function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-md border border-border">
      {children}
    </div>
  );
}

function TableHead() {
  return (
    <thead className="text-left text-text-muted">
      <tr>
        <th scope="col" className="px-2 py-2 font-normal">{rawToReady.rowNumberLabel}</th>
        {fields.map((field) => (
          <th key={field} scope="col" className="px-2 py-2 font-normal">
            {rawToReady.fieldLabels[field]}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function DataTable({
  rows,
  showProblems = false,
  showFixes = false,
}: {
  rows: typeof rawToReady.rawRows | typeof cleanRows;
  showProblems?: boolean;
  showFixes?: boolean;
}) {
  return (
    <TableFrame>
      <table className="min-w-[590px] table-fixed border-collapse font-mono text-[0.7rem] leading-relaxed">
        <TableHead />
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => {
            const values = "raw" in row ? row.raw : row.values;
            const problems = "raw" in row ? row.problems : undefined;
            const fixes = "raw" in row ? undefined : row.fixes;
            const number = "rowNumber" in row ? row.rowNumber : index + 1;
            return (
              <tr key={`${values.order_id}-${number}`} className="align-top text-text">
                <th scope="row" className="px-2 py-2 text-right font-normal text-text-muted">
                  {number}
                </th>
                {fields.map((field) => {
                  const problem = showProblems ? problems?.[field] : undefined;
                  const fix = showFixes ? fixes?.[field] : undefined;
                  const annotation = problem ?? fix;
                  return (
                    <td key={field} className="px-1.5 py-1.5">
                      <span
                        className={cx(
                          "inline-flex min-h-7 min-w-full flex-col items-start justify-center rounded px-1.5 py-0.5",
                          problem && "border border-status-warning/50 bg-status-warning/5",
                          fix && "border border-accent-cyan/50 bg-accent-cyan/5",
                        )}
                      >
                        <span className="whitespace-nowrap">{values[field]}</span>
                        {annotation ? (
                          <span
                            className={cx(
                              "mt-0.5 whitespace-nowrap text-[0.6rem] leading-tight",
                              problem ? "text-status-warning" : "text-accent-cyan-text",
                            )}
                          >
                            {annotation}
                          </span>
                        ) : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableFrame>
  );
}

function RawPanel() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <DataTable rows={rawToReady.rawRows} showProblems />
    </div>
  );
}

function CleanPanel() {
  const [showFixes, setShowFixes] = useState(false);
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <button
        type="button"
        aria-pressed={showFixes}
        onClick={() => setShowFixes((shown) => !shown)}
        className="min-h-11 self-start rounded-md border border-border-strong px-3 text-sm text-text transition-colors hover:bg-surface-2 active:translate-y-px"
      >
        {rawToReady.showFixesLabel}
      </button>
      <DataTable rows={cleanRows} showFixes={showFixes} />
      <div className="mt-auto rounded-md border border-border bg-surface-2/60 px-3 py-2">
        <p className="m-0 text-xs font-semibold text-text">{rawToReady.quarantine.heading}</p>
        <p className="m-0 mt-1 font-mono text-xs text-text-muted">
          {rawToReady.quarantine.orderIds.join(" · ")} <span className="font-sans">— {rawToReady.quarantine.note}</span>
        </p>
      </div>
    </div>
  );
}

function ReadyChart() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const points = cleanRows.map((row) => ({
    date: row.values.order_date,
    amount: Number(row.values.amount),
  }));
  const chart = { width: 400, height: 245, left: 48, right: 12, top: 16, bottom: 52 };
  const baseY = chart.height - chart.bottom;
  const plotHeight = baseY - chart.top;
  const plotWidth = chart.width - chart.left - chart.right;
  const maxAmount = rawToReady.chart.ticks.at(-1) ?? 250;
  const step = plotWidth / points.length;
  const barWidth = Math.min(42, step * 0.56);

  return (
    <svg
      role="group"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      className="block h-auto w-full overflow-visible"
    >
      <title id={titleId}>{rawToReady.chart.title}</title>
      <desc id={descriptionId}>{rawToReady.chart.description}</desc>
      {rawToReady.chart.ticks.map((tick) => {
        const y = baseY - (tick / maxAmount) * plotHeight;
        return (
          <g key={tick}>
            <line x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} className="stroke-border" />
            <text x={chart.left - 7} y={y + 3} textAnchor="end" className="fill-text-muted font-mono text-[9px]">
              {tick}
            </text>
          </g>
        );
      })}
      <line
        x1={chart.left}
        x2={chart.width - chart.right}
        y1={baseY}
        y2={baseY}
        className="stroke-border-strong"
      />
      <text
        x="12"
        y={chart.top + plotHeight / 2}
        transform={`rotate(-90 12 ${chart.top + plotHeight / 2})`}
        textAnchor="middle"
        className="fill-text-muted font-mono text-[9px]"
      >
        {rawToReady.chart.amountAxis}
      </text>
      {points.map((point, index) => {
        const height = (point.amount / maxAmount) * plotHeight;
        const x = chart.left + step * index + (step - barWidth) / 2;
        const y = baseY - height;
        const dateLabel = point.date.slice(5).replace("-", "/");
        const accessibleLabel = `${dateLabel}, ${rawToReady.chart.amountLabel} ${point.amount.toFixed(2)} dollars`;
        return (
          <g key={point.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx="3"
              className="fill-accent-cyan/80 stroke-accent-cyan-text"
              tabIndex={0}
              aria-label={accessibleLabel}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <title>{accessibleLabel}</title>
            </rect>
            {activeIndex === index ? (
              <text
                x={x + barWidth / 2}
                y={Math.max(chart.top + 10, y - 7)}
                textAnchor="middle"
                className="fill-text font-mono text-[10px]"
                aria-hidden="true"
              >
                {point.amount.toFixed(2)}
              </text>
            ) : null}
            <text x={x + barWidth / 2} y={baseY + 15} textAnchor="middle" className="fill-text-muted font-mono text-[9px]">
              {dateLabel}
            </text>
          </g>
        );
      })}
      <text
        x={chart.left + plotWidth / 2}
        y={chart.height - 8}
        textAnchor="middle"
        className="fill-text-muted font-mono text-[9px]"
      >
        {rawToReady.chart.dateAxis}
      </text>
    </svg>
  );
}

function ReadyPanel() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <ReadyChart />
      <p className="mt-auto border-t border-border pt-3 text-xs leading-relaxed text-text">
        {rawToReady.summary}
      </p>
    </div>
  );
}

const panelComponents = {
  raw: RawPanel,
  clean: CleanPanel,
  ready: ReadyPanel,
} satisfies Record<PanelId, () => React.JSX.Element>;

export default function RawToReady() {
  const [activePanel, setActivePanel] = useState<PanelId>("raw");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % panelIds.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex + panelIds.length - 1) % panelIds.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = panelIds.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextPanel = panelIds[nextIndex];
    setActivePanel(nextPanel);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      id="raw-to-ready"
      aria-labelledby="raw-to-ready-heading"
      className="relative z-[var(--z-content)] scroll-mt-[var(--nav-h)]"
    >
      <div className="mx-auto w-full max-w-[var(--container)] px-[var(--gutter)] py-12 md:py-16">
        <div className="mb-6">
          <h2
            id="raw-to-ready-heading"
            className="mb-2 font-heading text-h2 leading-tight font-bold tracking-tight text-text"
          >
            {rawToReady.title}
          </h2>
          <p className="m-0 text-sm leading-relaxed text-text-muted">{rawToReady.subtitle}</p>
          <p className="mb-0 mt-2 font-mono text-xs tracking-wide text-text-muted">{rawToReady.sampleCaption}</p>
        </div>

        <div role="tablist" aria-label={rawToReady.tabsLabel} className="mb-4 grid grid-cols-3 gap-2 md:hidden">
          {panelIds.map((id, index) => (
            <button
              key={id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`raw-to-ready-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={activePanel === id}
              aria-controls={`raw-to-ready-panel-${id}`}
              tabIndex={activePanel === id ? 0 : -1}
              onClick={() => setActivePanel(id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cx(
                "min-h-12 rounded-md border px-3 text-sm font-medium transition-colors",
                activePanel === id
                  ? "border-accent-cyan-text bg-surface-2 text-text"
                  : "border-border bg-surface text-text-muted hover:text-text",
              )}
            >
              {rawToReady.panelLabels[id]}
            </button>
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.08fr)]">
          {panelIds.map((id, index) => {
            const Panel = panelComponents[id];
            const active = activePanel === id;
            return (
              <Fragment key={id}>
                {index > 0 ? (
                  <svg
                    data-flow-arrow
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="hidden size-5 self-center text-accent-cyan-text md:block"
                  >
                    <path d="M4 12h15m-6-6 6 6-6 6" />
                  </svg>
                ) : null}
                <div
                  id={`raw-to-ready-panel-${id}`}
                  role="tabpanel"
                  aria-labelledby={`raw-to-ready-tab-${id}`}
                  tabIndex={0}
                  className={cx(
                    "flex min-w-0 flex-col rounded-xl border border-border bg-surface p-3 md:p-4",
                    active ? "flex" : "hidden md:flex",
                  )}
                >
                  <h3 className="mb-3 font-mono text-sm font-semibold text-text">{rawToReady.panelLabels[id]}</h3>
                  <Panel />
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
