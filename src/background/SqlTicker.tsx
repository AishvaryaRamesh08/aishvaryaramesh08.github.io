// SQL_Ticker (Req 6.7, 6.8, 6.10, 6.11). Snippets from `background.ts` in JetBrains Mono at
// 0.06 opacity, shown only where there is no body text: the 56 px seams that SectionShell reserves
// between sections, and side-gutter lanes outside `--container` at ≥ 1440 px. Scrolling is a CSS
// animation: paused while the tab is hidden, removed under reduced motion by the global
// `html[data-motion=reduced]` rule (static ticker).
import type { ReactNode } from "react";
import { TickerSeamContext, type TickerSeamRenderer } from "../components/TickerSeam";
import { background } from "../data/background";
import type { SectionId } from "../data/types";
import { useDocumentVisible } from "../hooks/useDocumentVisible";
import { cx } from "../lib/cx";
import { TICKER_OPACITY_RANGE } from "./scene";

/** Ticker opacity from config, clamped to the 0.05–0.08 band (Req 6.7). */
export const TICKER_OPACITY = Math.min(
  TICKER_OPACITY_RANGE[1],
  Math.max(TICKER_OPACITY_RANGE[0], background.ticker.opacity),
);

/** Approximate advance of one JetBrains Mono glyph at the ticker's 12 px size. */
const CHAR_WIDTH_PX = 7.2;
/** Space between snippets, px (matches `gap-12`). */
const SNIPPET_GAP_PX = 48;
/** Lower bound so a short track never scrolls fast. */
const MIN_DURATION_S = 30;

/** Snippets rotated so neighbouring seams start on different snippets. */
export function rotateSnippets(snippets: readonly string[], offset: number): string[] {
  const n = snippets.length;
  if (n === 0) return [];
  const k = ((Math.floor(offset) % n) + n) % n;
  return [...snippets.slice(k), ...snippets.slice(0, k)];
}

/** Seconds for one loop of a track at the configured ticker speed. */
export function tickerDurationSeconds(snippets: readonly string[], speedPxPerSec: number): number {
  const length = snippets.reduce((sum, s) => sum + s.length * CHAR_WIDTH_PX + SNIPPET_GAP_PX, 0);
  if (!(speedPxPerSec > 0)) return MIN_DURATION_S;
  return Math.max(MIN_DURATION_S, length / speedPxPerSec);
}

function seamOffset(sectionId: SectionId): number {
  let hash = 0;
  for (const ch of sectionId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

interface TrackProps {
  axis: "x" | "y";
  offset: number;
  className?: string;
}

/** One looping lane of snippets (two copies, scrolled by half its length). */
export function SqlTickerTrack({ axis, offset, className }: TrackProps) {
  const visible = useDocumentVisible();
  const snippets = rotateSnippets(background.ticker.snippets, offset);
  const duration = tickerDurationSeconds(snippets, background.ticker.speedPxPerSec);
  const copy = (key: string): ReactNode => (
    <span key={key} className={cx("flex shrink-0", axis === "x" ? "gap-12 pr-12" : "gap-12 pb-12")}>
      {snippets.map((snippet, i) => (
        <span key={i}>{snippet}</span>
      ))}
    </span>
  );
  return (
    <div
      data-sql-ticker={axis}
      style={{ opacity: TICKER_OPACITY }}
      className={cx(
        "pointer-events-none overflow-hidden font-mono text-xs whitespace-nowrap text-text select-none",
        className,
      )}
    >
      <div
        // In vertical-rl the flex row runs top to bottom, so both axes use a plain flex row.
        className={cx("flex", axis === "x" ? "sql-ticker-x w-max" : "sql-ticker-y h-max [writing-mode:vertical-rl]")}
        style={{ animationDuration: `${duration}s`, animationPlayState: visible ? "running" : "paused" }}
      >
        {copy("a")}
        {copy("b")}
      </div>
    </div>
  );
}

const renderSeamTicker: TickerSeamRenderer = (sectionId) => (
  <SqlTickerTrack axis="x" offset={seamOffset(sectionId)} className="absolute inset-0 flex items-center" />
);

/**
 * Supplies the seam ticker to every `TickerSeam`. The ticker content is fully deterministic
 * (snippets from config, pure rotation/length math, visibility defaults to `true` on the server),
 * so it renders the same during prerender, hydration and on the client — no hydration mismatch.
 */
export function SqlTickerProvider({ children }: { children: ReactNode }) {
  return <TickerSeamContext.Provider value={renderSeamTicker}>{children}</TickerSeamContext.Provider>;
}

/** Vertical ticker lanes in the side gutters, outside `--container`, at ≥ 1440 px only. */
export function SqlTickerGutters() {
  const lane = "absolute inset-y-0 hidden justify-center min-[1440px]:flex w-[calc((100%-var(--container))/2)]";
  return (
    <>
      <SqlTickerTrack axis="y" offset={0} className={cx(lane, "left-0")} />
      <SqlTickerTrack axis="y" offset={3} className={cx(lane, "right-0")} />
    </>
  );
}
