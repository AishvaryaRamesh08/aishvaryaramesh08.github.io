import { lazy, Suspense, useRef, useState, type ComponentType, type ReactNode } from "react";
import { site } from "../data/site";
import type { HeadedSectionId, SiteConfig } from "../data/types";
import { useInViewOnce } from "../hooks/useInViewOnce";
import { cx } from "../lib/cx";
import { ChunkErrorBoundary } from "./ChunkErrorBoundary";
import { ONE_VIEWPORT_MARGIN } from "./LazyVisibleChunk";
import { LoadingPlaceholder } from "./LoadingPlaceholder";
import { TickerSeam } from "./TickerSeam";

/** Widened from the `satisfies`-narrowed constant so optional fields such as `minHeight` are readable. */
const sections: SiteConfig["sections"] = site.sections;

/** Sections wrapped in a SectionShell: Hook_Screen through Contact. */
export type SectionShellId = HeadedSectionId | "hook";

/**
 * Dynamic import of a section body, e.g. `() => import("../sections/StorySection")`. `attempt`
 * is 0 first and increases on each Retry, so a loader can add a cache-busting query if needed.
 */
export type SectionLoader = (attempt: number) => Promise<{ default: ComponentType }>;

/** The Hook_Screen has no heading element; its visible headline `<p>` carries this ID (Req 3.2). */
export const HOOK_HEADLINE_ID = "hook-headline";

/** Reserved height for a lazy section without a configured `minHeight`. */
export const DEFAULT_SECTION_MIN_HEIGHT = "32rem";

/** ID of the element that labels a section: its h1/h2, or the Hook headline. */
export function sectionHeadingId(id: SectionShellId): string {
  return id === "hook" ? HOOK_HEADLINE_ID : `${id}-heading`;
}

interface CommonProps {
  id: SectionShellId;
  /** Overrides `sections[id].minHeight` for the reserved box while loading or failed. */
  minHeight?: string;
  /** `contained` (default) adds section padding and the page container; `bare` leaves layout to the body. */
  layout?: "contained" | "bare";
  className?: string;
  /** Render the 56 px SQL_Ticker seam after the content (default true). */
  seam?: boolean;
}

export type SectionShellProps = CommonProps &
  (
    | {
        /** Eagerly bundled body (it may still contain `React.lazy` parts). */
        children: ReactNode;
        load?: never;
        eager?: never;
      }
    | {
        children?: never;
        /** Lazy body chunk, requested once the section is within one viewport height (Req 30.2). */
        load: SectionLoader;
        /** Request the chunk on mount instead of on approach. */
        eager?: boolean;
      }
  );

/**
 * Shared section wrapper (Req 3.2, 3.3, 30.9). Renders `<section id aria-labelledby>` and the
 * section heading from `site.sections` (h1 for the Intro, h2 otherwise, `tabIndex={-1}` so
 * navigation can focus it), so the anchor and accessible name exist in the prerendered HTML even
 * while the body chunk is still loading. The body sits in `Suspense` + `ChunkErrorBoundary`: a
 * reserved min-height while pending, and "This section couldn't be loaded" + Retry on failure,
 * with the heading and anchor kept. A ticker seam closes the section.
 */
export function SectionShell(props: SectionShellProps) {
  const { id, layout = "contained", className, seam = true } = props;
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inView = useInViewOnce(sectionRef, { rootMargin: ONE_VIEWPORT_MARGIN });

  const loader = props.load;
  // A rejected `React.lazy` stays rejected, so each Retry swaps in a fresh lazy component.
  const [lazyBody, setLazyBody] = useState(() =>
    loader ? { attempt: 0, Body: lazy(() => loader(0)) } : null,
  );

  const reserved =
    props.minHeight ?? (id === "hook" ? undefined : sections[id].minHeight) ?? DEFAULT_SECTION_MIN_HEIGHT;
  const pending = <LoadingPlaceholder minHeight={reserved} />;

  const handleRetry = () => {
    if (loader && lazyBody) {
      const attempt = lazyBody.attempt + 1;
      setLazyBody({ attempt, Body: lazy(() => loader(attempt)) });
    }
    // The Retry button is about to disappear: keep focus in the section.
    headingRef.current?.focus({ preventScroll: true });
  };

  let body: ReactNode;
  if (lazyBody) {
    const { Body } = lazyBody;
    body = props.eager || inView ? <Body /> : pending;
  } else {
    body = props.children;
  }

  const headingId = sectionHeadingId(id);
  let heading: ReactNode = null;
  if (id === "intro") {
    heading = (
      <h1
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="scroll-mt-[var(--nav-h)] font-heading text-hero leading-tight font-bold tracking-tight text-text"
      >
        {sections.intro.heading}
      </h1>
    );
  } else if (id !== "hook") {
    heading = (
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="mb-8 scroll-mt-[var(--nav-h)] font-heading text-h2 leading-tight font-bold tracking-tight text-text"
      >
        {sections[id].heading}
      </h2>
    );
  }

  const content = (
    <>
      {heading}
      <ChunkErrorBoundary onRetry={handleRetry} minHeight={reserved}>
        <Suspense fallback={pending}>{body}</Suspense>
      </ChunkErrorBoundary>
    </>
  );

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={headingId}
      className={cx("relative z-[var(--z-content)]", className)}
    >
      {layout === "contained" ? (
        <div
          className={cx(
            "mx-auto w-full max-w-[var(--container)] px-[var(--gutter)]",
            id === "hook" ? "py-0" : "py-[var(--section-y)]",
          )}
        >
          {content}
        </div>
      ) : (
        content
      )}
      {seam ? <TickerSeam sectionId={id} /> : null}
    </section>
  );
}
