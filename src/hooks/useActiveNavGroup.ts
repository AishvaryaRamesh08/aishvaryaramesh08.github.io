// Active Navbar link (design: "Navigation and scrolling"; Req 7.11).
import { useState } from "react";
import { site } from "../data/site";
import type { NavGroupId, SectionId } from "../data/types";
import { resolveActiveNavGroup, type SectionRect } from "../lib/scroll";
import { useScrollFrame } from "./useScrollFrame";

/** Every section covered by a Nav_Group; Hook_Screen and Footer are deliberately absent. */
const GROUPED_SECTION_IDS: readonly SectionId[] = site.navGroups.flatMap((group) => group.sections);

/** Document-space extents of the grouped sections currently in the DOM. */
function measureSectionRects(scrollY: number): SectionRect[] {
  const rects: SectionRect[] = [];
  for (const id of GROUPED_SECTION_IDS) {
    const element = document.getElementById(id);
    if (!element) continue;
    const box = element.getBoundingClientRect();
    rects.push({ id, top: box.top + scrollY, bottom: box.bottom + scrollY });
  }
  return rects;
}

/**
 * The Nav_Group containing the viewport's vertical midpoint, or `null` over the Hook_Screen,
 * the Footer or any ungrouped area (Req 7.11). Re-evaluated once per animation frame while
 * scrolling (shared `useScrollFrame` listener) and once on mount. `null` during prerender.
 */
export function useActiveNavGroup(): NavGroupId | null {
  const [active, setActive] = useState<NavGroupId | null>(null);
  useScrollFrame((scrollY) => {
    const midY = scrollY + window.innerHeight / 2;
    setActive(resolveActiveNavGroup(midY, measureSectionRects(scrollY), site.navGroups));
  });
  return active;
}
