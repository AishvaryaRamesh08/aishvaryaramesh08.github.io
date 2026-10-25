import { useEffect, useState, type RefObject } from "react";

export interface InViewOnceOptions {
  /** IntersectionObserver root margin, e.g. "200px" to trigger early. */
  rootMargin?: string;
  /** Fraction of the element (0–1) that must be visible. Defaults to any pixel. */
  amount?: number;
}

/**
 * Latches `true` the first time the element enters the viewport and never resets.
 * Without IntersectionObserver it reports `true`, so gated content is never left unloaded.
 */
export function useInViewOnce(ref: RefObject<Element | null>, { rootMargin = "0px", amount = 0 }: InViewOnceOptions = {}): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      const id = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= amount)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: amount },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, amount, inView]);

  return inView;
}
