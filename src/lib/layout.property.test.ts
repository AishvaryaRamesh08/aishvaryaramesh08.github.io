// Feature: portfolio-website, Property 49: Enlarged artifact fits the viewport —
// for any artifact intrinsic size and viewport size, fitToViewport returns a box that preserves the
// aspect ratio, fits within the viewport padding box, and is larger than the gallery thumbnail
// whenever the viewport allows it.
// **Validates: Requirements 16.6**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fitToViewport, type Padding, type Size } from "./layout";

const EPS = 1e-9;

/** a ≈ b within a relative tolerance. */
function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
}

/** a ≤ b allowing for floating-point rounding. */
function atMost(a: number, b: number): boolean {
  return a <= b + EPS * Math.max(1, Math.abs(b));
}

const arbLength = (min: number, max: number) => fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

/** Intrinsic artifact size: anything from a tiny icon to a large diagram, any aspect ratio. */
const arbIntrinsic: fc.Arbitrary<Size> = fc.record({ width: arbLength(1, 10_000), height: arbLength(1, 10_000) });

/** Viewport from a small phone to a large desktop. */
const arbViewport: fc.Arbitrary<Size> = fc.record({ width: arbLength(200, 4_000), height: arbLength(200, 4_000) });

/** Padding as one number or per axis, small enough that room always remains in arbViewport. */
const arbPadding: fc.Arbitrary<Padding> = fc.oneof(
  arbLength(0, 64),
  fc.record({ x: arbLength(0, 64), y: arbLength(0, 64) }),
);

function padAxes(padding: Padding): { x: number; y: number } {
  return typeof padding === "number" ? { x: padding, y: padding } : padding;
}

function available(viewport: Size, padding: Padding): Size {
  const { x, y } = padAxes(padding);
  return { width: viewport.width - 2 * x, height: viewport.height - 2 * y };
}

describe("Property 49: Enlarged artifact fits the viewport", () => {
  it("preserves the aspect ratio, fits the padded viewport and fills one axis", () => {
    fc.assert(
      fc.property(arbIntrinsic, arbViewport, arbPadding, (intrinsic, viewport, padding) => {
        const box = fitToViewport(intrinsic, viewport, padding);
        const room = available(viewport, padding);

        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);

        // Aspect ratio preserved (cross-multiplied to avoid dividing by small numbers).
        expect(close(box.width * intrinsic.height, box.height * intrinsic.width)).toBe(true);

        // Fits within the viewport padding box.
        expect(atMost(box.width, room.width)).toBe(true);
        expect(atMost(box.height, room.height)).toBe(true);

        // Largest such box: one axis is filled exactly.
        expect(close(box.width, room.width) || close(box.height, room.height)).toBe(true);
      }),
    );
  });

  it("is at least as large as any same-ratio thumbnail that fits, and larger when there is room", () => {
    fc.assert(
      fc.property(
        arbIntrinsic,
        arbViewport,
        arbPadding,
        fc.double({ min: 0.01, max: 1, noNaN: true }),
        (intrinsic, viewport, padding, scale) => {
          const box = fitToViewport(intrinsic, viewport, padding);
          const room = available(viewport, padding);

          // A gallery thumbnail is the artifact at a smaller scale: same aspect ratio, sized so it
          // fits inside the padded viewport at `scale` ≤ 1 of the largest fitting box.
          const ratio = intrinsic.width / intrinsic.height;
          const maxThumbWidth = Math.min(room.width, room.height * ratio);
          const thumb: Size = { width: maxThumbWidth * scale, height: (maxThumbWidth * scale) / ratio };

          // Never smaller than a thumbnail that fits.
          expect(atMost(thumb.width, box.width)).toBe(true);
          expect(atMost(thumb.height, box.height)).toBe(true);

          // Whenever the viewport allows a bigger view, the enlarged box is strictly larger.
          if (scale < 1 - 1e-6) {
            expect(box.width).toBeGreaterThan(thumb.width);
            expect(box.height).toBeGreaterThan(thumb.height);
          }
        },
      ),
    );
  });

  it("scales up past the intrinsic size when the viewport is bigger than the artifact", () => {
    fc.assert(
      fc.property(arbLength(1, 150), arbLength(1, 150), arbViewport, (width, height, viewport) => {
        // Intrinsic size fits well inside the smallest viewport in arbViewport (≥ 200 px, no padding).
        const box = fitToViewport({ width, height }, viewport);
        expect(box.width).toBeGreaterThan(width);
        expect(box.height).toBeGreaterThan(height);
      }),
    );
  });

  it("returns a 0 × 0 box for a non-positive or non-finite intrinsic size, or no room after padding", () => {
    const arbBadLength = fc.constantFrom(0, -1, -500, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY);
    const arbBadIntrinsic: fc.Arbitrary<Size> = fc.oneof(
      fc.record({ width: arbBadLength, height: arbLength(1, 10_000) }),
      fc.record({ width: arbLength(1, 10_000), height: arbBadLength }),
    );

    fc.assert(
      fc.property(arbBadIntrinsic, arbViewport, arbPadding, (intrinsic, viewport, padding) => {
        expect(fitToViewport(intrinsic, viewport, padding)).toEqual({ width: 0, height: 0 });
      }),
    );

    fc.assert(
      fc.property(arbIntrinsic, arbViewport, fc.boolean(), (intrinsic, viewport, onX) => {
        // Padding that consumes the whole viewport on one axis.
        const padding: Padding = onX
          ? { x: viewport.width / 2, y: 0 }
          : { x: 0, y: viewport.height / 2 + 1 };
        expect(fitToViewport(intrinsic, viewport, padding)).toEqual({ width: 0, height: 0 });
      }),
    );
  });
});
