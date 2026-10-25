// Small seeded PRNG shared by the Background_Layer scene and (later) the OHLC generator.
// Pure and deterministic: the same seed always yields the same sequence.

/** A generator of uniform values in [0, 1). */
export type Rng = () => number;

/**
 * mulberry32: a fast 32-bit PRNG. Any finite number is accepted as a seed (it is truncated to an
 * unsigned 32-bit integer); non-finite seeds behave like 0.
 */
export function mulberry32(seed: number): Rng {
  let state = Number.isFinite(seed) ? seed >>> 0 : 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform value in [min, max) drawn from `rng`. */
export function randomBetween(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Uniform integer in [0, n) drawn from `rng`; returns 0 when n ≤ 1. */
export function randomIndex(rng: Rng, n: number): number {
  if (!(n > 1)) return 0;
  return Math.min(n - 1, Math.floor(rng() * n));
}
