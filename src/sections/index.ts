/**
 * Section registry (design "Component tree", Req 3.1, 32.1): every section from the Hook_Screen
 * to Contact, in Requirement 3 order, with how its body is loaded. `App` renders one
 * `SectionShell` per entry, so each anchor ID and heading is in the prerendered HTML.
 *
 * The Hook_Screen and Intro_Screen are above the fold and bundled eagerly (Req 29.7); every
 * section below the Intro is a `React.lazy` chunk requested within one viewport height (Req 30.2).
 */
import type { ComponentType } from "react";
import type { SectionLoader, SectionShellId } from "../components/SectionShell";
import type { SectionId } from "../data/types";
import { sectionsUpTo } from "../hooks/useHashScroll";
import HookScreen from "./hook/HookScreen";
import IntroScreen from "./intro/IntroScreen";

interface SectionEntryBase {
  id: SectionShellId;
  /** `SectionShell` layout; defaults to `contained`. */
  layout?: "contained" | "bare";
  /** Whether the section ends with a ticker seam; defaults to true. */
  seam?: boolean;
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
  { id: "hook", kind: "eager", Component: HookScreen },
  { id: "intro", kind: "eager", Component: IntroScreen },
  { id: "work", kind: "lazy", load: () => import("./work/FeaturedWork") },
  { id: "skills", kind: "lazy", load: () => import("./skills/SkillConstellation") },
  { id: "certifications", kind: "lazy", load: () => import("./certifications/Certifications") },
  { id: "terminal", kind: "lazy", load: () => import("./terminal/TerminalBand") },
  { id: "journey", kind: "lazy", load: () => import("./journey/JourneyChart") },
  { id: "built-with-ai", kind: "lazy", load: () => import("./built-with-ai/BuiltWithAi") },
  { id: "analysis", kind: "lazy", load: () => import("./analysis/AnalysisSection") },
  { id: "story", kind: "lazy", load: () => import("./story/StorySection") },
  { id: "contact", kind: "lazy", load: () => import("./contact/Contact") },
];

/** Section IDs inside `main`, in page order. */
export const SECTION_IDS: readonly SectionShellId[] = SECTIONS.map((entry) => entry.id);

/** Chunk loader of each lazy section; eager sections have none. */
export const sectionLoaders: Partial<Record<SectionId, SectionLoader>> = Object.fromEntries(
  SECTIONS.flatMap((entry) => (entry.kind === "lazy" ? [[entry.id, entry.load] as const] : [])),
);

/**
 * Starts loading every lazy section from the Hook_Screen up to and including `target` and
 * resolves once all have settled (rejections are swallowed: the shell shows Retry). Used by
 * `useHashScroll` so a fragment jump lands after the content above it has rendered (Req 3.4).
 */
export function preloadSectionsUpTo(target: SectionId): Promise<unknown> {
  return Promise.allSettled(sectionsUpTo(target).map((id) => sectionLoaders[id]?.(0)));
}
