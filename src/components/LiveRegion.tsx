import { useCallback, useState } from "react";
import { cx } from "../lib/cx";

export type Politeness = "polite" | "assertive";

export interface LiveRegionProps {
  /** Current message; an empty string clears the region. */
  message: string;
  /**
   * Changes on every announcement. The message node is keyed on it, so the node is replaced and
   * a repeated identical message is announced again, with only the new text read.
   */
  messageKey?: number;
  politeness?: Politeness;
  /** Show the message on screen as well (default: screen-reader only). */
  visible?: boolean;
  className?: string;
  id?: string;
}

/**
 * Polite (`role="status"`) or assertive (`role="alert"`) announcer. Render it on first paint and
 * keep it mounted, so assistive technologies see content changes rather than a new region.
 */
export function LiveRegion({ message, messageKey = 0, politeness = "polite", visible = false, className, id }: LiveRegionProps) {
  return (
    <div
      id={id}
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      aria-atomic="true"
      className={cx(!visible && "sr-only", className)}
    >
      {message ? <span key={messageKey}>{message}</span> : null}
    </div>
  );
}

export interface Announcer {
  message: string;
  messageKey: number;
  /** Replaces the region's content with `text`. */
  announce: (text: string) => void;
  clear: () => void;
}

/** State for a `LiveRegion`: `<LiveRegion message={a.message} messageKey={a.messageKey} />`. */
export function useAnnouncer(): Announcer {
  const [state, setState] = useState({ message: "", messageKey: 0 });
  const announce = useCallback((text: string) => {
    setState((prev) => ({ message: text, messageKey: prev.messageKey + 1 }));
  }, []);
  const clear = useCallback(() => {
    setState((prev) => ({ message: "", messageKey: prev.messageKey + 1 }));
  }, []);
  return { message: state.message, messageKey: state.messageKey, announce, clear };
}
