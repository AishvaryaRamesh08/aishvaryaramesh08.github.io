// Pure layout helpers (design: Lightbox, Property 49). No DOM access, SSR-safe.

export interface Size {
  width: number;
  height: number;
}

/** Space kept clear on each side: one number for all sides, or per axis (left/right, top/bottom). */
export type Padding = number | { x: number; y: number };

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The largest box with the aspect ratio of `intrinsic` that fits inside `viewport` minus
 * `padding` on each side (Req 16.6, 20.9). It scales up as well as down, so the enlarged view is
 * larger than its gallery thumbnail whenever the viewport has room. Returns a 0 × 0 box when the
 * intrinsic size is not a positive finite size or no room is left after padding.
 */
export function fitToViewport(intrinsic: Size, viewport: Size, padding: Padding = 0): Size {
  if (!isPositiveFinite(intrinsic.width) || !isPositiveFinite(intrinsic.height)) return { width: 0, height: 0 };
  const padX = nonNegative(typeof padding === "number" ? padding : padding.x);
  const padY = nonNegative(typeof padding === "number" ? padding : padding.y);
  const availableWidth = Math.max(0, nonNegative(viewport.width) - 2 * padX);
  const availableHeight = Math.max(0, nonNegative(viewport.height) - 2 * padY);
  if (availableWidth === 0 || availableHeight === 0) return { width: 0, height: 0 };

  const ratio = intrinsic.width / intrinsic.height;
  // Width-limited unless that box would be too tall; then height-limited.
  if (availableWidth / ratio <= availableHeight) {
    return { width: availableWidth, height: availableWidth / ratio };
  }
  return { width: availableHeight * ratio, height: availableHeight };
}
