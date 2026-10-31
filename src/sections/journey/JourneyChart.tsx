import { useState } from "react";
import type { JourneyStage } from "../../data/types";
import { journey } from "../../data/journey";
import { cx } from "../../lib/cx";

const CHART_TITLE = "Education and career journey";
const CHART_DESCRIPTION =
  "Four stages rise from undergraduate study through internship and data engineering to current graduate study.";
const DESKTOP_POINTS = [
  { x: 125, y: 120 },
  { x: 375, y: 89 },
  { x: 625, y: 58 },
  { x: 875, y: 27 },
] as const;
const DESKTOP_BUTTON_TOPS = [108, 77, 46, 15] as const;

function JourneySvg({ mobile = false }: { mobile?: boolean }) {
  if (mobile) {
    return (
      <svg
        viewBox="0 0 52 320"
        preserveAspectRatio="none"
        aria-labelledby="journey-mobile-title journey-mobile-description"
        className="pointer-events-none absolute inset-y-0 left-0 h-full w-[52px] md:hidden"
      >
        <title id="journey-mobile-title">{CHART_TITLE}</title>
        <desc id="journey-mobile-description">{CHART_DESCRIPTION}</desc>
        <path d="M16 38 H32 V120 H16 V202 H32 V284" fill="none" strokeWidth="3" className="stroke-accent-cyan-text" />
        {[{ x: 16, y: 38 }, { x: 32, y: 120 }, { x: 16, y: 202 }, { x: 32, y: 284 }].map((point, index) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={index === 3 ? 9 : 7}
            strokeWidth="3"
            className={index === 3 ? "fill-accent-cyan-text stroke-surface" : "fill-surface stroke-accent-cyan-text"}
          />
        ))}
      </svg>
    );
  }

  const [first, ...rest] = DESKTOP_POINTS;
  const path = rest.reduce((current, point) => `${current} H ${point.x} V ${point.y}`, `M ${first.x} ${first.y}`);

  return (
    <svg
      viewBox="0 0 1000 208"
      preserveAspectRatio="none"
      aria-labelledby="journey-desktop-title journey-desktop-description"
      className="absolute inset-0 hidden h-full w-full md:block"
    >
      <title id="journey-desktop-title">{CHART_TITLE}</title>
      <desc id="journey-desktop-description">{CHART_DESCRIPTION}</desc>
      <path d={path} fill="none" strokeWidth="3" strokeLinejoin="round" className="stroke-accent-cyan-text" />
    </svg>
  );
}

function StageButton({
  stage,
  index,
  selected,
  onSelect,
  mobile = false,
}: {
  stage: JourneyStage;
  index: number;
  selected: boolean;
  onSelect: () => void;
  mobile?: boolean;
}) {
  const point = DESKTOP_POINTS[index];
  const desktopPosition = !mobile && point
    ? { left: `${(point.x / 1000) * 100}%`, top: `${DESKTOP_BUTTON_TOPS[index]}px` }
    : undefined;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onFocus={onSelect}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onSelect();
      }}
      onClick={onSelect}
      style={desktopPosition}
      className={cx(
        "group min-h-11 rounded-xl border border-transparent text-left transition-colors duration-150 hover:border-border-strong hover:bg-surface/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan",
        selected && "border-border bg-surface shadow-sm",
        mobile
          ? "relative z-10 ml-0 flex w-full min-w-0 flex-col items-start p-3 pl-14"
          : "absolute z-10 flex w-[23%] -translate-x-1/2 flex-col items-center px-2 py-1 text-center",
      )}
    >
      {mobile ? (
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-[3px] border-surface ring-2 ring-accent-cyan-text",
            index % 2 === 0 ? "left-2" : "left-6",
            stage.current ? "bg-accent-cyan-text" : "bg-surface",
          )}
        />
      ) : (
        <span
        aria-hidden="true"
        className={cx(
          "mb-1 h-4 w-4 rounded-full border-[3px] border-surface ring-2 ring-accent-cyan-text",
          stage.current ? "bg-accent-cyan-text" : "bg-surface",
        )}
        />
      )}
      <span className="block font-heading text-sm font-semibold leading-tight text-text">{stage.label}</span>
      <span className="mt-1 block max-w-full break-words text-xs leading-snug text-text-muted">{stage.organization}</span>
      <span className="mt-1 block font-mono text-[0.6875rem] leading-snug text-text-muted">{stage.years}</span>
      {stage.current ? (
        <span className="mt-1 inline-flex min-h-6 items-center rounded-pill border border-accent-cyan px-2 font-mono text-[0.625rem] uppercase tracking-wide text-accent-cyan-text">
          Current
        </span>
      ) : null}
    </button>
  );
}

function StageDetail({ stage }: { stage: JourneyStage }) {
  return (
    <div
      aria-live="polite"
      className="rounded-xl border border-border bg-surface px-4 py-3 md:min-h-[76px] md:px-5"
    >
      <h3 className="font-heading text-sm font-semibold text-text">{stage.label}</h3>
      <ul className="mt-1 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-xs leading-relaxed text-text-muted md:text-sm">
        {stage.detail.map((line) => <li key={line} className="break-words">{line}</li>)}
      </ul>
    </div>
  );
}

export default function JourneyChart() {
  const currentIndex = journey.findIndex((stage) => stage.current);
  const [selectedIndex, setSelectedIndex] = useState(currentIndex >= 0 ? currentIndex : journey.length - 1);
  const selectedStage = journey[selectedIndex] ?? journey[journey.length - 1];

  return (
    <div data-section-body="journey" role="group" aria-label="Career journey" className="flex flex-col gap-3">
      <div className="relative hidden h-[208px] w-full md:block">
        <JourneySvg />
        {journey.map((stage, index) => (
          <StageButton
            key={stage.label}
            stage={stage}
            index={index}
            selected={selectedIndex === index}
            onSelect={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      <div className="relative flex flex-col gap-3 py-1 md:hidden">
        <JourneySvg mobile />
        {journey.map((stage, index) => (
          <StageButton
            key={stage.label}
            stage={stage}
            index={index}
            selected={selectedIndex === index}
            onSelect={() => setSelectedIndex(index)}
            mobile
          />
        ))}
      </div>

      <StageDetail stage={selectedStage} />
    </div>
  );
}
