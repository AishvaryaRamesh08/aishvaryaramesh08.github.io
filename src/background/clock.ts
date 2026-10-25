// Visible-only animation clock for the Background_Layer engine (Req 6.10).
// Animation time is accumulated rather than read from the wall clock: it advances only on visible
// frames and by at most `maxDt` per frame, so a hidden tab pauses the scene and resuming continues
// from the paused position without replaying (catching up on) missed time.

export interface Clock {
  /** Accumulated animation time in ms. */
  elapsed: number;
  /** Timestamp of the previous visible frame, or null when paused / not yet started. */
  last: number | null;
}

/** Default per-frame cap in ms (about three 60 Hz frames). */
export const DEFAULT_MAX_DT = 50;

export function createClock(elapsed = 0): Clock {
  return { elapsed: Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 0, last: null };
}

/**
 * Advances the clock for a frame at timestamp `now` (e.g. the rAF timestamp).
 * - Hidden frame: time does not advance and the reference timestamp is dropped (`last = null`).
 * - First visible frame after start or a hidden period: records `now` and advances by 0.
 * - Otherwise: advances by `min(max(now − last, 0), maxDt)`.
 */
export function advanceClock(clock: Clock, now: number, visible: boolean, maxDt: number = DEFAULT_MAX_DT): Clock {
  if (!visible || !Number.isFinite(now)) return { elapsed: clock.elapsed, last: null };
  if (clock.last === null) return { elapsed: clock.elapsed, last: now };
  const cap = Number.isFinite(maxDt) && maxDt > 0 ? maxDt : 0;
  const dt = Math.min(Math.max(now - clock.last, 0), cap);
  return { elapsed: clock.elapsed + dt, last: now };
}
