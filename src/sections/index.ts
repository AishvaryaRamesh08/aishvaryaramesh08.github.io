/**
 * Section registry (design "Component tree", Req 3.1, 32.1): every section from the Hero
 * to Contact, in page order, with how its body is loaded. `App` renders one
 * `SectionShell` per entry, so each anchor ID and heading is in the prerendered HTML.
 *
 * The Hero is bundled eagerly; every later section is a `React.lazy` chunk requested within one
 * viewport height (Req 30.2). HookScreen remains available for a future section but is not mounted.
 */
import type { ComponentType } from "react";
import type { SectionLoader, SectionShellId } from "../components/SectionShell";
import type { SectionId } from "../data/types";
import { sectionsUpTo } from "../hooks/useHashScroll";
import IntroScreen from "./intro/IntroScreen";

interface SectionEntryBase {
  id: SectionShellId;
  /** `SectionShell` layout; defaults to `contained`. */
  layout?: "contained" | "bare";
  /** Whether the section ends with a ticker seam; defaults to true. */
  seam?: boolean;
  /** The body renders its own section heading, for layouts that place it within their content grid. */
  headingInBody?: boolean;
}

/** Body bundled with the entry chunk and rendered as `SectionShell` children. */
export interface EagerSectionEntry extends SectionEntryBase {
  kind: "eager";
  Component: ComponentType;
}

/** Body loaded as its own chunk through `SectionShell load`. */
export interface LazySectionEntry extends SectionEntryBase {
  kind: "lazy";
  load: SectionLoader;
}

export type SectionEntry = EagerSectionEntry | LazySectionEntry;

export const SECTIONS: readonly SectionEntry[] = [
  { id: "home", kind: "eager", Component: IntroScreen, layout: "bare", headingInBody: true },
  { id: "work", kind: "lazy", load: () => import("./work/FeaturedWork") },
  { id: "skills", kind: "lazy", load: () => import("./skills/SkillConstellation") },
  { id: "journey", kind: "lazy", load: () => import("./journey/JourneyChart") },
  { id: "contact", kind: "lazy", load: () => import("./contact/Contact") },
];

/** Section IDs inside `main`, in page order. */
export const SECTION_IDS: readonly SectionShellId[] = SECTIONS.map((entry) => entry.id);

/** Chunk loader of each lazy section; eager sections have none. */
export const sectionLoaders: Partial<Record<SectionId, SectionLoader>> = Object.fromEntries(
  SECTIONS.flatMap((entry) => (entry.kind === "lazy" ? [[entry.id, entry.load] as const] : [])),
);

/**
 * Starts loading every lazy section from the Hero up to and including `target` and
 * resolves once all have settled (rejections are swallowed: the shell shows Retry). Used by
 * `useHashScroll` so a fragment jump lands after the content above it has rendered (Req 3.4).
 */
export function preloadSectionsUpTo(target: SectionId): Promise<unknown> {
  return Promise.allSettled(sectionsUpTo(target).map((id) => sectionLoaders[id]?.(0)));
}
