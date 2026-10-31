// Fragment on load (design: "Navigation and scrolling"; Req 3.4, 3.5).
import { useEffect, useEffectEvent } from "react";
import { site } from "../data/site";
import type { SectionId } from "../data/types";
import { scrollToSection } from "../lib/scrollToSection";

/** Rendered section IDs a fragment may target, in page order. */
export const SECTION_ANCHOR_IDS: readonly SectionId[] = [
  ...(Object.keys(site.sections) as SectionId[]),
];

/** Upper bound on waiting for sections before the fragment scroll runs anyway. */
export const HASH_SCROLL_TIMEOUT_MS = 3000;

/** Consecutive animation frames in which the target's position must not change. */
const STABLE_FRAMES = 2;

export function isSectionAnchorId(value: string): value is SectionId {
  return (SECTION_ANCHOR_IDS as readonly string[]).includes(value);
}

/** Every section from the Hook_Screen up to and including `target`, in page order. */
export function sectionsUpTo(target: SectionId): SectionId[] {
  const index = SECTION_ANCHOR_IDS.indexOf(target);
  return index < 0 ? [] : SECTION_ANCHOR_IDS.slice(0, index + 1);
}

/** The known section ID named by `hash` (with or without `#`, percent-decoded), else `null`. */
export function parseSectionHash(hash: string): SectionId | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw === "") return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return isSectionAnchorId(decoded) ? decoded : null;
}

export interface UseHashScrollOptions {
  /**
   * Starts loading the lazy chunks of every section up to `targetId` (see `sectionsUpTo`) and
   * resolves when they have loaded. Rejections are ignored; the scroll still happens.
   */
  preload?: (targetId: SectionId) => Promise<unknown>;
  /** Cap on the whole wait (preload plus layout settling); default 3000 ms. */
  timeoutMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Document-space top of `id` plus page height: changes whenever content above it re-lays out. */
function layoutSignature(id: string): string {
  const element = document.getElementById(id);
  const top = element ? element.getBoundingClientRect().top + window.scrollY : -1;
  return `${top}|${document.documentElement.scrollHeight}`;
}

/**
 * Resolves once `preload(target)` has settled and the target's position has been stable for
 * a couple of frames (so freshly rendered chunks above it no longer push it down), or once
 * `deadline` (a `Date.now()` timestamp) passes, whichever comes first.
 */
async function waitForSections(
  target: SectionId,
  preload: (targetId: SectionId) => unknown,
  deadline: number,
  isCancelled: () => boolean,
): Promise<void> {
  const loaded = Promise.resolve()
    .then(() => preload(target))
    .catch(() => undefined);
  await Promise.race([loaded, delay(deadline - Date.now())]);
  let previous = "";
  let stable = 0;
  while (!isCancelled() && Date.now() < deadline && stable < STABLE_FRAMES) {
    await nextFrame();
    const current = layoutSignature(target);
    stable = current === previous ? stable + 1 : 0;
    previous = current;
  }
}

/**
 * On mount, if `location.hash` names a known section, waits for the sections up to it (preload +
 * layout settle, capped at `timeoutMs`) and then calls `scrollToSection` (Req 3.4). Unknown
 * fragments are ignored silently: the page stays at the Hook_Screen with no error (Req 3.5).
 * Focus is left alone on load, like a native fragment jump.
 */
export function useHashScroll(options: UseHashScrollOptions = {}): void {
  const { timeoutMs = HASH_SCROLL_TIMEOUT_MS } = options;
  const preload = useEffectEvent((target: SectionId) => options.preload?.(target));

  useEffect(() => {
    const target = parseSectionHash(window.location.hash);
    if (target === null) return;
    let cancelled = false;
    const deadline = Date.now() + timeoutMs;
    const load = (id: SectionId) => preload(id);
    void waitForSections(target, load, deadline, () => cancelled).then(() => {
      if (!cancelled) void scrollToSection(target, { focus: false });
    });
    return () => {
      cancelled = true;
    };
    // Runs once per mount: the fragment is only honoured on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
