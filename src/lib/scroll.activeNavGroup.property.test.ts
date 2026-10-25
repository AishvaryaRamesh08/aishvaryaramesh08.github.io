// Feature: portfolio-website, Property 22: Active Nav_Group —
// for any stack of contiguous section rectangles (Hook, grouped sections, Footer, with arbitrary
// positive heights) and any viewport midpoint, resolveActiveNavGroup returns the Nav_Group of the
// section containing the midpoint, or null when the midpoint lies in the Hook_Screen, the Footer or
// outside every section. It never returns more than one group.
// **Validates: Requirements 7.11**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { site } from "../data/site";
import type { NavGroup, NavGroupId, SectionId } from "../data/types";
import { resolveActiveNavGroup, type SectionRect } from "./scroll";

/** The real group config, widened from its `satisfies` literal types. */
const NAV_GROUPS: readonly NavGroup[] = site.navGroups;

/** Page order of the measured sections: Hook, every rendered section, Footer. */
const SECTION_ORDER: readonly SectionId[] = [
  "hook",
  ...(Object.keys(site.sections) as SectionId[]),
  "site-footer",
];

/** Independent oracle: every group listing the section (the config must yield at most one). */
function groupsOf(id: SectionId): NavGroupId[] {
  return NAV_GROUPS.filter((group) => group.sections.includes(id)).map((group) => group.id);
}

/**
 * Contiguous, ordered layout: a random document offset followed by one positive integer height per
 * section. Integers keep every `bottom` exactly equal to the next `top`, so boundaries are exact.
 */
const arbLayout = fc
  .tuple(
    fc.integer({ min: 0, max: 5_000 }),
    fc.array(fc.integer({ min: 1, max: 4_000 }), {
      minLength: SECTION_ORDER.length,
      maxLength: SECTION_ORDER.length,
    }),
  )
  .map(([start, heights]) => {
    const rects: SectionRect[] = [];
    let top = start;
    SECTION_ORDER.forEach((id, i) => {
      const bottom = top + heights[i];
      rects.push({ id, top, bottom });
      top = bottom;
    });
    return rects;
  });

describe("Property 22: Active Nav_Group", () => {
  it("each section belongs to at most one Nav_Group, Hook and Footer to none", () => {
    for (const id of SECTION_ORDER) {
      expect(groupsOf(id).length).toBeLessThanOrEqual(1);
    }
    expect(groupsOf("hook")).toEqual([]);
    expect(groupsOf("site-footer")).toEqual([]);
  });

  it("a midpoint inside a section resolves to that section's group (null for Hook/Footer)", () => {
    fc.assert(
      fc.property(
        arbLayout,
        fc.nat({ max: SECTION_ORDER.length - 1 }),
        fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }),
        (rects, index, fraction) => {
          const rect = rects[index];
          // Integer offset in [0, height): top-inclusive, bottom-exclusive.
          const midY = rect.top + Math.floor(fraction * (rect.bottom - rect.top));
          const expected = groupsOf(rect.id)[0] ?? null;
          expect(resolveActiveNavGroup(midY, rects, NAV_GROUPS)).toBe(expected);
        },
      ),
    );
  });

  it("a section boundary belongs to the lower section (top inclusive, bottom exclusive)", () => {
    fc.assert(
      fc.property(arbLayout, fc.integer({ min: 1, max: SECTION_ORDER.length - 1 }), (rects, index) => {
        const midY = rects[index].top; // === rects[index - 1].bottom
        expect(midY).toBe(rects[index - 1].bottom);
        const expected = groupsOf(rects[index].id)[0] ?? null;
        expect(resolveActiveNavGroup(midY, rects, NAV_GROUPS)).toBe(expected);
      }),
    );
  });

  it("a midpoint outside every section resolves to null", () => {
    fc.assert(
      fc.property(arbLayout, fc.integer({ min: 0, max: 10_000 }), fc.boolean(), (rects, gap, above) => {
        const first = rects[0];
        const last = rects[rects.length - 1];
        // Above: strictly before the first top. Below: at or past the last (exclusive) bottom.
        const midY = above ? first.top - 1 - gap : last.bottom + gap;
        expect(resolveActiveNavGroup(midY, rects, NAV_GROUPS)).toBeNull();
      }),
    );
  });

  it("any midpoint yields null or exactly one configured group matching the containing section", () => {
    fc.assert(
      fc.property(arbLayout, fc.integer({ min: -2_000, max: 70_000 }), (rects, midY) => {
        const result = resolveActiveNavGroup(midY, rects, NAV_GROUPS);
        const containing = rects.filter((rect) => rect.top <= midY && midY < rect.bottom);
        expect(containing.length).toBeLessThanOrEqual(1);
        const expected = containing.length === 1 ? (groupsOf(containing[0].id)[0] ?? null) : null;
        expect(result).toBe(expected);
        if (result !== null) {
          expect(NAV_GROUPS.filter((group) => group.id === result)).toHaveLength(1);
        }
      }),
    );
  });
});
