import { createContext, useContext, type ReactNode } from "react";
import type { SectionId } from "../data/types";

/**
 * Renders the decorative SQL_Ticker content for one seam. Provided by the Background_Layer
 * (task 7.7); without a provider, seams stay empty but keep their reserved height.
 */
export type TickerSeamRenderer = (sectionId: SectionId) => ReactNode;

export const TickerSeamContext = createContext<TickerSeamRenderer | null>(null);

/** Height reserved for each seam, in px (design: "SQL_Ticker placement"). */
export const TICKER_SEAM_HEIGHT = 56;

/**
 * 56 px band at the end of a section, reserved for the SQL_Ticker so the ticker never overlaps
 * body text (Req 6.7, 6.8). Decorative: hidden from assistive technologies, never focusable,
 * never intercepts pointer events (Req 6.13, 28.8).
 */
export function TickerSeam({ sectionId }: { sectionId: SectionId }) {
  const render = useContext(TickerSeamContext);
  return (
    <div
      aria-hidden="true"
      data-ticker-seam={sectionId}
      style={{ height: `${TICKER_SEAM_HEIGHT}px` }}
      className="pointer-events-none relative overflow-hidden select-none"
    >
      {render ? render(sectionId) : null}
    </div>
  );
}
