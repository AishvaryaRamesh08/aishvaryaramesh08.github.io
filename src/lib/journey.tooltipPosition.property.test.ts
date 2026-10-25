// Feature: portfolio-website, Property 14: Tooltip stays in the viewport —
// for any viewport width ≥ 320 px, any anchor rectangle inside the viewport and any tooltip size
// whose width is ≤ viewport − 16 px (and ≤ tooltipMaxWidth) and height ≤ viewport height − 16 px,
// positionTooltip returns a position where the whole tooltip lies inside the viewport with the
// 8 px margin. With room above, it sits above the anchor, horizontally centered unless clamped;
// with no room above but room below, it flips below.
// **Validates: Requirements 19.17**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  positionTooltip,
  TOOLTIP_GAP,
  TOOLTIP_VIEWPORT_MARGIN,
  tooltipMaxWidth,
  type Rect,
  type Size,
} from "./journey";

const M = TOOLTIP_VIEWPORT_MARGIN;
const EPS = 1e-9;

interface Case {
  viewport: Size;
  anchor: Rect;
  size: Size;
}

/** Viewport (≥ 320 px wide), an anchor fully inside it and a tooltip size within the limits. */
const arbCase: fc.Arbitrary<Case> = fc
  .record({
    width: fc.integer({ min: 320, max: 2560 }),
    height: fc.integer({ min: 200, max: 1600 }),
  })
  .chain((viewport) =>
    fc
      .record({
        aw: fc.integer({ min: 0, max: Math.min(120, viewport.width) }),
        ah: fc.integer({ min: 0, max: Math.min(120, viewport.height) }),
        w: fc.integer({ min: 1, max: tooltipMaxWidth(viewport.width) }),
        h: fc.integer({ min: 1, max: viewport.height - 2 * M }),
      })
      .chain(({ aw, ah, w, h }) =>
        fc
          .record({
            ax: fc.double({ min: 0, max: viewport.width - aw, noNaN: true }),
            ay: fc.double({ min: 0, max: viewport.height - ah, noNaN: true }),
          })
          .map(({ ax, ay }) => ({
            viewport,
            anchor: { x: ax, y: ay, width: aw, height: ah },
            size: { width: w, height: h },
          })),
      ),
  );

describe("Property 14: Tooltip stays in the viewport", () => {
  it("tooltip rect lies fully inside the viewport with the 8 px margin", () => {
    fc.assert(
      fc.property(arbCase, ({ viewport, anchor, size }) => {
        const p = positionTooltip(anchor, size, viewport);
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(M - EPS);
        expect(p.y).toBeGreaterThanOrEqual(M - EPS);
        expect(p.x + size.width).toBeLessThanOrEqual(viewport.width - M + EPS);
        expect(p.y + size.height).toBeLessThanOrEqual(viewport.height - M + EPS);
      }),
    );
  });

  it("prefers above (centered unless clamped), flips below when there is no room above", () => {
    fc.assert(
      fc.property(arbCase, ({ viewport, anchor, size }) => {
        const p = positionTooltip(anchor, size, viewport);
        const above = anchor.y - TOOLTIP_GAP - size.height;
        const below = anchor.y + anchor.height + TOOLTIP_GAP;
        if (above >= M) {
          expect(p.y).toBeCloseTo(above, 9);
        } else if (below + size.height <= viewport.height - M) {
          expect(p.y).toBeCloseTo(below, 9);
        }
        const centered = anchor.x + anchor.width / 2 - size.width / 2;
        if (centered >= M && centered + size.width <= viewport.width - M) {
          expect(p.x).toBeCloseTo(centered, 9);
        }
      }),
    );
  });

  it("tooltipMaxWidth is min(22rem, viewport − 16 px)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 320, max: 2560 }), fc.integer({ min: 8, max: 32 }), (vw, rem) => {
        expect(tooltipMaxWidth(vw, rem)).toBe(Math.min(22 * rem, vw - 16));
      }),
    );
  });
});
