import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInViewOnce } from "../hooks/useInViewOnce";

/** One viewport height above and below the visible area (Req 1.4, 30.2). */
export const ONE_VIEWPORT_MARGIN = "100% 0px";

export interface LazyVisibleChunkProps<T> {
  /**
   * Starts the download; called once per attempt. Memoize it (e.g. `loadD3`) so other triggers
   * share the same request, and let it forget a rejected promise so Retry can try again.
   */
  load: () => Promise<T>;
  /** How early to start, as an IntersectionObserver root margin. Default: one viewport height. */
  rootMargin?: string;
  /** Starts loading immediately when true, e.g. when a containing panel expands (Req 13.8). */
  trigger?: boolean;
  /** Shown before the load starts and while it is pending. */
  fallback: ReactNode;
  /** Shown when the load rejects; call `retry` from a Retry control (Req 30.9). */
  error: (retry: () => void, reason: unknown) => ReactNode;
  /** Renders the loaded value. */
  children: (value: T) => ReactNode;
  className?: string;
}

type Outcome<T> = { attempt: number } & ({ ok: true; value: T } | { ok: false; reason: unknown });

/**
 * Loads a lazy chunk or library the first time its container comes within `rootMargin` of the
 * viewport (or `trigger` turns true), then renders it. Failures stay local: the `error` view
 * replaces only this slot. SSR and first client render show `fallback`.
 */
export function LazyVisibleChunk<T>({
  load,
  rootMargin = ONE_VIEWPORT_MARGIN,
  trigger = false,
  fallback,
  error,
  children,
  className,
}: LazyVisibleChunkProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(ref, { rootMargin });
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome<T> | null>(null);
  const requested = inView || trigger || attempt > 0;

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    load().then(
      (value) => {
        if (!cancelled) setOutcome({ attempt, ok: true, value });
      },
      (reason: unknown) => {
        if (!cancelled) setOutcome({ attempt, ok: false, reason });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [requested, load, attempt]);

  // A result from an earlier attempt means the current attempt is still pending.
  const current = outcome && outcome.attempt === attempt ? outcome : null;
  let content: ReactNode = fallback;
  if (current?.ok) content = children(current.value);
  else if (current && !current.ok) content = error(() => setAttempt((n) => n + 1), current.reason);

  return (
    <div ref={ref} className={className}>
      {content}
    </div>
  );
}
