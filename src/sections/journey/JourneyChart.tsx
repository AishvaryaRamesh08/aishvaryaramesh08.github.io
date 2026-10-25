// Journey_Chart (Req 19). Plotly draws the visuals; React owns all interaction. SSR-safe: the
// chart needs the DOM, so the server (and the first client render) ship only the text alternative
// — an ordered list of every Journey_Stage — plus a fixed-size LoadingPlaceholder. The chart is
// mounted on the client, one viewport approach away, through the shared Plotly loader. On a load,
// init or timeout failure the same list becomes the visible fallback, so the information is always
// reachable without the chart or a pointer (Req 19.22, 19.24, 19.25).
//
// The heading and anchor come from `SectionShell`, so they are prerendered (Req 3.2, 3.3).
import {
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { GlassCard } from "../../components/GlassCard";
import { LazyVisibleChunk } from "../../components/LazyVisibleChunk";
import { LoadingPlaceholder } from "../../components/LoadingPlaceholder";
import type { JourneyStage } from "../../data/types";
import { journey } from "../../data/journey";
import { getMotionMode, subscribeMotionMode, type MotionMode } from "../../hooks/motionStore";
import { getTheme, subscribeTheme } from "../../hooks/themeStore";
import { useIsClient } from "../../hooks/useIsClient";
import { cx } from "../../lib/cx";
import type { Theme } from "../../lib/theme";
import {
  buildJourneyTrace,
  INITIAL_TOOLTIP_STATE,
  JOURNEY_COLORS,
  JOURNEY_HIT_AREA,
  JOURNEY_LABEL_MAX,
  journeyChartHeight,
  journeyTooltipReducer,
  layoutJourneyLabels,
  markerPositions,
  positionTooltip,
  tooltipMaxWidth,
  type LabelBox,
  type Point,
  type Size,
} from "../../lib/journey";
import { loadPlotly, withTimeout, type Config, type Data, type Layout, type PlotlyApi } from "../../charts/plotlyLoader";

const stages: readonly JourneyStage[] = journey;

/** Approach distance that starts the Plotly request (Req 19.23: within 200 px of the viewport). */
const APPROACH_MARGIN = "200px 0px";

/** Accessible name of the chart figure and intro of the text alternative. */
const CHART_LABEL = "Career journey step chart";

/** Accessible name of each marker button: "label, approxYear" (Req 19.18). */
const markerName = (stage: JourneyStage): string => `${stage.label}, ${stage.approxYear}`;

// ---------- Text alternative (always rendered; the load-failure fallback when shown) ----------

/**
 * Ordered list of every Journey_Stage with its label, approxYear and detail (Req 19.22, 19.25).
 * Rendered visually hidden and referenced by the figure's `aria-describedby`; shown visibly as the
 * fallback when the chart fails to load, init or arrive in time.
 */
function JourneyList({ id, visible }: { id: string; visible: boolean }) {
  return (
    <ol
      id={id}
      className={cx(
        visible ? "flex flex-col gap-4" : "sr-only",
        "m-0 list-none p-0",
      )}
    >
      {stages.map((stage) => (
        <li key={stage.label} className={visible ? "rounded-card border border-border bg-surface p-4" : undefined}>
          <p className="m-0">
            <span className="font-heading font-semibold text-text">{stage.label}</span>{" "}
            <span className="font-mono text-sm text-text-muted">{stage.approxYear}</span>
          </p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-text-muted">{stage.detail}</p>
        </li>
      ))}
    </ol>
  );
}

// ---------- Default export: SSR-safe shell ----------

/** Journey_Chart body. Shows the chart on the client; the server/text path never touches Plotly. */
export default function JourneyChart() {
  const isClient = useIsClient();
  const describedById = useId();

  return (
    <figure
      data-section-body="journey"
      aria-label={CHART_LABEL}
      aria-describedby={describedById}
      className="m-0 flex flex-col gap-6"
    >
      {/* Always present text alternative (visually hidden) referenced by aria-describedby. */}
      <JourneyList id={describedById} visible={false} />

      {isClient ? (
        <LazyVisibleChunk<PlotlyApi>
          load={() => withTimeout(loadPlotlyOnce())}
          rootMargin={APPROACH_MARGIN}
          fallback={<ChartPlaceholder />}
          // On load/init/timeout failure the ordered list is the visible fallback (Req 19.25).
          error={() => <JourneyFallback />}
        >
          {(plotly) => <JourneyChartClient plotly={plotly} />}
        </LazyVisibleChunk>
      ) : (
        // Server + first client render: the placeholder, so hydration sees the same markup and the
        // swap to the chart moves no surrounding content (Req 19.24).
        <ChartPlaceholder />
      )}
    </figure>
  );
}

// The loader is memoized app-wide; wrap it so `LazyVisibleChunk` gets a stable identity and a fresh
// `withTimeout` wait per attempt (the shared import is never re-requested — see plotlyLoader.ts).
const loadPlotlyOnce = (): Promise<PlotlyApi> => loadPlotly();

/** Reserves the chart's box at the current width so swapping in the chart shifts nothing. */
function ChartPlaceholder() {
  const width = useContainerWidth();
  const height = Math.round(journeyChartHeight(width));
  return (
    <div style={{ width: "100%" }}>
      <LoadingPlaceholder minHeight={`${height}px`} className="w-full" />
    </div>
  );
}

/** Visible fallback: the accessible ordered list of all stages. */
function JourneyFallback() {
  const listId = useId();
  return <JourneyList id={listId} visible />;
}

/** Best-effort current container width for the initial placeholder height (SSR-safe default). */
function useContainerWidth(): number {
  const [width, setWidth] = useState(360);
  useEffect(() => {
    const read = () => setWidth(Math.max(320, Math.min(window.innerWidth - 32, 1100)));
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return width;
}

// ---------- Client chart ----------

interface ChartSize {
  width: number;
  height: number;
}

/**
 * The live chart: Plotly draws the step line and markers into `plotRef`; a React-owned overlay of
 * 44 × 44 buttons sits on top (one per stage, keyboard-focusable, named "label, approxYear"), and a
 * GlassCard tooltip driven by `journeyTooltipReducer` follows the active marker. Redraws on theme
 * change; the pulse and GSAP entrance run only under full motion (Req 19.3, 19.13–19.16).
 */
function JourneyChartClient({ plotly }: { plotly: PlotlyApi }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize | null>(null);
  const [theme, setTheme] = useState<Theme>(() => getTheme());
  const [motion, setMotion] = useState<MotionMode>(() => getMotionMode());
  const [state, dispatch] = useReducer(journeyTooltipReducer, INITIAL_TOOLTIP_STATE);
  const entrancePlayed = useRef(false);

  const n = stages.length;

  // --- Theme: re-read JOURNEY_COLORS[theme] and redraw on change (Req 19.11, 19.13). ---
  useEffect(() => subscribeTheme(() => setTheme(getTheme())), []);
  // --- Reduced motion: live changes toggle the pulse / entrance (Req 19.15). ---
  useEffect(() => subscribeMotionMode(() => setMotion(getMotionMode())), []);

  // --- Measure the container; recompute marker positions and labels on resize. ---
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth || 360;
      setSize({ width, height: Math.round(journeyChartHeight(width)) });
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Draw / redraw the Plotly figure whenever size, theme or motion changes. ---
  useEffect(() => {
    const el = plotRef.current;
    if (!el || !size) return;
    let cancelled = false;
    const colors = JOURNEY_COLORS[theme];
    const { data, layout, config } = buildJourneyTrace(stages, colors);
    // The lib builds exact, well-formed objects; widen them to Plotly's broad input types here.
    const plotData = data as unknown as Data[];
    const plotLayout = { ...layout, width: size.width, height: size.height } as unknown as Partial<Layout>;
    const plotConfig = config as unknown as Partial<Config>;

    plotly
      .newPlot(el, plotData, plotLayout, plotConfig)
      .then(() => {
        if (cancelled) return;
        // Cyan→violet gradient injected into the line path; solid cyan already set as a fallback.
        applyLineGradient(el, colors.line, JOURNEY_COLORS[theme].currentRing);
        if (motion === "full" && !entrancePlayed.current) {
          entrancePlayed.current = true;
          void playStrokeDashEntrance(el);
        }
      })
      .catch(() => {
        // A newPlot failure leaves the fallback list reachable; nothing else to do here.
      });

    return () => {
      cancelled = true;
    };
  }, [plotly, size, theme, motion]);

  // Clean up Plotly's DOM when the chart unmounts.
  useEffect(() => {
    const el = plotRef.current;
    return () => {
      if (el) plotly.purge(el);
    };
  }, [plotly]);

  // --- Geometry for the overlay buttons and labels (same coordinate space as the plot box). ---
  const box = size ? { x: 0, y: 0, width: size.width, height: size.height } : null;
  const positions: Point[] = box ? markerPositions(n, box) : [];
  const labelSizes: Size[] = stages.map(() => ({
    width: JOURNEY_LABEL_MAX.width,
    height: JOURNEY_LABEL_MAX.height,
  }));
  const labels: LabelBox[] = box ? layoutJourneyLabels(positions, labelSizes, box) : [];

  // --- Close the tooltip on an outside tap/click or Escape (Req 19.20). ---
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const container = containerRef.current;
      if (container && event.target instanceof Node && !container.contains(event.target)) {
        dispatch({ type: "outside" });
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "escape" });
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const colors = JOURNEY_COLORS[theme];

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={size ? { height: `${size.height}px` } : undefined}
    >
      {/* Plotly's drawing surface. Decorative only — all interaction lives in the overlay. */}
      <div ref={plotRef} aria-hidden="true" className="absolute inset-0" />

      {/* JetBrains Mono labels placed by `layoutJourneyLabels`; aria-hidden (names are on buttons). */}
      {box
        ? labels.map((label) => (
            <span
              key={`label-${label.index}`}
              aria-hidden="true"
              className="pointer-events-none absolute whitespace-nowrap font-mono text-xs text-text"
              style={labelStyle(label)}
            >
              {stages[label.index].label}
            </span>
          ))
        : null}

      {/* Marker overlay: one 44 × 44 button per stage, in order, keyboard-focusable (Req 19.12, 19.18). */}
      {box
        ? positions.map((point, index) => {
            const stage = stages[index];
            const isCurrent = index === n - 1;
            return (
              <JourneyMarkerButton
                key={`marker-${stage.label}`}
                point={point}
                name={markerName(stage)}
                isCurrent={isCurrent}
                pulse={isCurrent && motion === "full"}
                ringColor={colors.currentRing}
                onEvent={dispatch}
                index={index}
              />
            );
          })
        : null}

      {/* The single open Journey_Tooltip, positioned within the viewport by `positionTooltip`. */}
      {state.open !== null && positions[state.open] ? (
        <JourneyTooltip stage={stages[state.open]} anchor={positions[state.open]} containerRef={containerRef} />
      ) : null}

      <ScopedChartStyles ringColor={colors.currentRing} />
    </div>
  );
}

/** Inline style for a placed label (top-left corner from `layoutJourneyLabels`). */
function labelStyle(label: LabelBox): CSSProperties {
  const style: CSSProperties = { left: `${label.x}px`, top: `${label.y}px`, maxWidth: `${label.width}px` };
  if (label.anchor === "center") style.textAlign = "center";
  else if (label.anchor === "end") style.textAlign = "right";
  return style;
}

// ---------- Marker button ----------

function JourneyMarkerButton({
  point,
  name,
  isCurrent,
  pulse,
  ringColor,
  index,
  onEvent,
}: {
  point: Point;
  name: string;
  isCurrent: boolean;
  pulse: boolean;
  ringColor: string;
  index: number;
  onEvent: (event: Parameters<typeof journeyTooltipReducer>[1]) => void;
}) {
  // Only fine (mouse) pointers hover-open; touch uses tap-to-toggle (Req 19.2, 19.21).
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") onEvent({ type: "pointerEnter", index });
  };
  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") onEvent({ type: "pointerLeave", index });
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || e.pointerType === "pen") onEvent({ type: "tap", index });
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      onEvent({ type: "activate", index });
    }
  };

  return (
    <button
      type="button"
      aria-label={name}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      onFocus={() => onEvent({ type: "focus", index })}
      onBlur={() => onEvent({ type: "blur", index })}
      onKeyDown={handleKeyDown}
      className="absolute flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      style={{
        left: `${point.x}px`,
        top: `${point.y}px`,
        width: `${JOURNEY_HIT_AREA}px`,
        height: `${JOURNEY_HIT_AREA}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {isCurrent ? (
        <span
          aria-hidden="true"
          className={cx("journey-pulse-dot absolute inset-0 rounded-full", !pulse && "journey-pulse-off")}
          style={{ ["--journey-ring" as string]: ringColor }}
        />
      ) : null}
    </button>
  );
}

// ---------- Tooltip ----------

function JourneyTooltip({
  stage,
  anchor,
  containerRef,
}: {
  stage: JourneyStage;
  anchor: Point;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const container = containerRef.current;
    if (!card || !container) return;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    // The anchor point is in container space; convert the hit box to viewport coordinates.
    const containerRect = container.getBoundingClientRect();
    const half = JOURNEY_HIT_AREA / 2;
    const anchorRect = {
      x: containerRect.left + anchor.x - half,
      y: containerRect.top + anchor.y - half,
      width: JOURNEY_HIT_AREA,
      height: JOURNEY_HIT_AREA,
    };
    const tipSize: Size = { width: card.offsetWidth, height: card.offsetHeight };
    const placed = positionTooltip(anchorRect, tipSize, viewport);
    // Back into container-relative coordinates for absolute positioning inside the chart box.
    setPos({ left: placed.x - containerRect.left, top: placed.y - containerRect.top });
  }, [anchor, stage, containerRef]);

  const maxWidth = typeof window === "undefined" ? 352 : tooltipMaxWidth(window.innerWidth);

  return (
    <div
      ref={cardRef}
      role="tooltip"
      className="pointer-events-none absolute z-10"
      style={{
        left: pos ? `${pos.left}px` : "0px",
        top: pos ? `${pos.top}px` : "0px",
        maxWidth: `${maxWidth}px`,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <GlassCard glow className="p-4">
        <p className="m-0 font-heading text-sm font-semibold text-text">{stage.label}</p>
        <p className="m-0 mt-0.5 font-mono text-xs text-accent-cyan-text">{stage.approxYear}</p>
        <p className="m-0 mt-2 text-sm leading-relaxed text-text-muted">{stage.detail}</p>
      </GlassCard>
    </div>
  );
}

// ---------- Scoped CSS: current-marker pulse (off under reduced motion) ----------

function ScopedChartStyles({ ringColor }: { ringColor: string }) {
  return (
    <style>{`
      @keyframes journey-pulse {
        0% { transform: scale(1); opacity: 0.6; }
        80% { transform: scale(1.5); opacity: 0; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      .journey-pulse-dot {
        box-shadow: 0 0 0 2px var(--journey-ring, ${ringColor});
        animation: journey-pulse 2.4s ease-out infinite;
      }
      .journey-pulse-off { animation: none; }
      html[data-motion="reduced"] .journey-pulse-dot { animation: none; }
    `}</style>
  );
}

// ---------- Plotly SVG post-processing (not pure — DOM only, runs after newPlot) ----------

/**
 * Injects a cyan→violet `<linearGradient>` into Plotly's SVG `<defs>` and points the step line's
 * stroke at it (Req 19.13). The solid cyan stroke built by `buildJourneyTrace` stays as the
 * fallback if the SVG shape is not found.
 */
function applyLineGradient(root: HTMLElement, from: string, to: string): void {
  try {
    const svg = root.querySelector("svg.main-svg") ?? root.querySelector("svg");
    if (!(svg instanceof SVGSVGElement)) return;
    const NS = "http://www.w3.org/2000/svg";
    const gradientId = "journey-line-gradient";
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(NS, "defs");
      svg.insertBefore(defs, svg.firstChild);
    }
    defs.querySelector(`#${gradientId}`)?.remove();
    const gradient = document.createElementNS(NS, "linearGradient");
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("x1", "0");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("x2", "1");
    gradient.setAttribute("y2", "0");
    for (const [offset, color] of [
      ["0%", from],
      ["100%", to],
    ] as const) {
      const stop = document.createElementNS(NS, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      gradient.appendChild(stop);
    }
    defs.appendChild(gradient);
    const paths = svg.querySelectorAll<SVGPathElement>(".scatterlayer .js-line, .scatterlayer path.js-line");
    paths.forEach((path) => path.setAttribute("stroke", `url(#${gradientId})`));
  } catch {
    // Any DOM shape mismatch just leaves the solid cyan line — still a valid chart.
  }
}

/**
 * GSAP stroke-dash entrance (≤ 1.2 s, once per load): the step line draws left to right. GSAP is
 * imported lazily so it stays out of the server path; any failure is silent (no entrance).
 */
async function playStrokeDashEntrance(root: HTMLElement): Promise<void> {
  try {
    const svg = root.querySelector("svg.main-svg") ?? root.querySelector("svg");
    if (!svg) return;
    const path = svg.querySelector<SVGPathElement>(".scatterlayer .js-line");
    if (!path || typeof path.getTotalLength !== "function") return;
    const length = path.getTotalLength();
    if (!length) return;
    const { gsap } = await import("gsap");
    gsap.fromTo(
      path,
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 1.0, ease: "power1.out", clearProps: "strokeDasharray,strokeDashoffset" },
    );
  } catch {
    // No GSAP / no measurable path: the line is simply shown in its final state.
  }
}
