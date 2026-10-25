// Pure scroll, stage and tab mappings (Req 7.5, 7.11, 10.2, 14.5, 14.7, 14.11).
// No DOM access: hooks and components measure the page and feed numbers in, so every mapping
// here is a deterministic function of its inputs and can be property-tested directly.

import type { NavGroup, NavGroupId, SectionId } from "../data/types";

/** Vertical extent of a rendered section in document coordinates (top inclusive, bottom exclusive). */
export interface SectionRect {
  id: SectionId;
  top: number;
  bottom: number;
}

/**
 * Offset into a stage used as a tab scroll target, so floating-point rounding at the exact stage
 * boundary can never resolve to the previous stage (Design "Animation strategy": `(k−1)/n + ε`).
 */
export const STAGE_EPSILON = 0.001;

/** Clamps to [0, 1]; NaN maps to 0. */
function clamp01(value: number): number {
  if (!(value > 0)) return 0;
  return value > 1 ? 1 : value;
}

/**
 * Page scroll progress for the Navbar bar (Req 7.5):
 * `clamp(scrollY / (docH − viewH), 0, 1)`. A page that cannot scroll reports 0.
 */
export function scrollProgress(scrollY: number, docH: number, viewH: number): number {
  const scrollable = docH - viewH;
  if (!(scrollable > 0)) return 0;
  return clamp01(scrollY / scrollable);
}

/**
 * The single Nav_Group whose sections contain the viewport midpoint (Req 7.11), or `null` when the
 * midpoint lies in a section outside every group (Hook_Screen, Footer) or outside every section.
 */
export function resolveActiveNavGroup(
  midY: number,
  rects: readonly SectionRect[],
  groups: readonly NavGroup[],
): NavGroupId | null {
  const section = rects.find((rect) => rect.top <= midY && midY < rect.bottom);
  if (section === undefined) return null;
  const group = groups.find((candidate) => candidate.sections.includes(section.id));
  return group?.id ?? null;
}

/**
 * Current 0-based Viz_Showcase stage for pinned scroll progress `p` over `n` stages (Req 14.5):
 * returns k − 1 exactly when `(k−1)/n ≤ p < k/n`, and the last stage for `p ≥ (n−1)/n`.
 * Equivalent to `min(n−1, floor(clamp(p)·n))`, but compares against the same `k/n` boundaries
 * the spec states so the result never drifts at floating-point edges.
 */
export function stageAtProgress(p: number, n: number): number {
  const progress = clamp01(p);
  let stage = 0;
  while (stage < n - 1 && progress >= (stage + 1) / n) stage += 1;
  return stage;
}

/**
 * Pinned-range progress a tab should scroll to for the 1-based stage `k` of `n` (Req 14.7):
 * `(k−1)/n + ε`, so `stageAtProgress(progressForStage(k, n), n) === k − 1`.
 * `k` is clamped to [1, n].
 */
export function progressForStage(k: number, n: number): number {
  const stage = Math.min(Math.max(Math.trunc(k), 1), Math.max(n, 1));
  return Math.min((stage - 1) / n + STAGE_EPSILON, 1);
}

/**
 * Number of Story rows morphed to their clean state at scroll progress `p` (Req 10.2):
 * `floor(clamp(p, 0, 1) · n)`. Depends only on `p`, so scroll direction is irrelevant.
 */
export function rowsCleanedAtProgress(p: number, n: number): number {
  return Math.floor(clamp01(p) * n);
}

/**
 * Roving-tabindex target for a WAI-ARIA tab list of `n` tabs (Req 14.11), without wrap-around:
 * ArrowRight → `min(i+1, n−1)`, ArrowLeft → `max(i−1, 0)`, Home → 0, End → n−1, any other key → i.
 */
export function nextTabIndex(key: string, current: number, n: number): number {
  switch (key) {
    case "ArrowRight":
      return Math.min(current + 1, n - 1);
    case "ArrowLeft":
      return Math.max(current - 1, 0);
    case "Home":
      return 0;
    case "End":
      return n - 1;
    default:
      return current;
  }
}
