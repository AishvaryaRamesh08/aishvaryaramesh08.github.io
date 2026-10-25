// Pure motion helpers for the Intro_Screen typewriter and stat-chip count-up (Req 9.2, 9.6).
// No DOM or timers: hooks feed elapsed time / animation progress in, so every frame is a
// deterministic function of its inputs and can be property-tested directly.

/** Per-character typing and deleting speeds plus the full-line hold, all in milliseconds. */
export interface TypeTiming {
  typeMs: number;
  holdMs: number;
  deleteMs: number;
}

/** Design "Animation strategy": type 45 ms/char, hold 2400 ms (Req 9.2 needs ≥ 2 s), delete 25 ms/char. */
export const DEFAULT_TYPE_TIMING: Readonly<TypeTiming> = { typeMs: 45, holdMs: 2400, deleteMs: 25 };

export interface TypewriterFrame {
  lineIndex: number;
  text: string;
}

/** Non-negative finite number, otherwise 0. */
function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Characters shown after `ms` of a phase at `perCharMs`; a zero speed completes instantly. */
function charsAfter(ms: number, perCharMs: number, length: number): number {
  if (perCharMs <= 0) return length;
  return Math.min(length, Math.floor(ms / perCharMs));
}

/**
 * Typewriter state `elapsedMs` after the animation started (Req 9.2).
 *
 * Each line runs type → hold → delete, then the next line starts, wrapping from the last line back
 * to the first. The full line is visible from the end of typing until the first character is
 * deleted, which is at least `holdMs`. Slicing is by code point so astral characters are never
 * split. Negative or non-finite elapsed time is treated as 0; an empty `lines` yields an empty frame.
 */
export function typewriterFrame(elapsedMs: number, lines: readonly string[], t: TypeTiming): TypewriterFrame {
  if (lines.length === 0) return { lineIndex: 0, text: "" };

  const typeMs = nonNegative(t.typeMs);
  const holdMs = nonNegative(t.holdMs);
  const deleteMs = nonNegative(t.deleteMs);
  const chars = lines.map((line) => Array.from(line));
  const durations = chars.map((c) => c.length * typeMs + holdMs + c.length * deleteMs);
  const cycle = durations.reduce((sum, d) => sum + d, 0);
  if (cycle <= 0) return { lineIndex: 0, text: lines[0] ?? "" };

  let remaining = nonNegative(elapsedMs) % cycle;
  let lineIndex = 0;
  while (lineIndex < lines.length - 1 && remaining >= (durations[lineIndex] ?? 0)) {
    remaining -= durations[lineIndex] ?? 0;
    lineIndex += 1;
  }

  const line = chars[lineIndex] ?? [];
  const typeEnd = line.length * typeMs;
  const holdEnd = typeEnd + holdMs;
  let shown: number;
  if (remaining < typeEnd) shown = charsAfter(remaining, typeMs, line.length);
  else if (remaining < holdEnd) shown = line.length;
  else shown = line.length - charsAfter(remaining - holdEnd, deleteMs, line.length);

  return { lineIndex, text: line.slice(0, shown).join("") };
}

/** Splits `finalText` into prefix, first run of ASCII digits, and suffix (e.g. `50+` → "", "50", "+"). */
const NUMBER_PATTERN = /^(\D*)(\d+)([\s\S]*)$/;

/**
 * Chip text at count-up `progress` in [0, 1] (Req 9.6). The first integer in `finalText` counts
 * from 0 up to its value while any prefix and suffix stay fixed, so `countUpText(0.5, "50+")` is
 * `"25+"`. The numeric part is non-decreasing in progress, and `progress ≥ 1` returns `finalText`
 * exactly. Text without digits, or with an integer beyond `Number.MAX_SAFE_INTEGER`, is returned
 * unchanged at every progress. NaN progress is treated as 0.
 */
export function countUpText(progress: number, finalText: string): string {
  if (progress >= 1) return finalText;
  const match = NUMBER_PATTERN.exec(finalText);
  if (match === null) return finalText;
  const [, prefix = "", digits = "", suffix = ""] = match;
  const target = Number(digits);
  if (!Number.isSafeInteger(target)) return finalText;
  const p = progress > 0 ? progress : 0;
  return `${prefix}${Math.floor(p * target)}${suffix}`;
}
