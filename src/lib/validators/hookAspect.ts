/**
 * `hookAspect` (Req 8.5): hookBefore and hookAfter must declare the same aspect ratio, so the
 * before/after comparison is honest. Checked by integer cross-multiplication, never by dividing.
 * Placeholders count too: their declared box is what the Hook_Screen renders (Req 8.4).
 */
import { CONTENT_FILES, validationError, type Content, type Size, type ValidationError } from "./types";

const isPositiveInt = (n: number): boolean => Number.isSafeInteger(n) && n > 0;

/** Errors when either box is not positive integers, or when `wB × hA ≠ wA × hB`. */
export function checkHookAspect(before: Size, after: Size): ValidationError[] {
  const file = CONTENT_FILES.hookImages;
  const errors: ValidationError[] = [];
  for (const [key, box] of [["hookBefore", before], ["hookAfter", after]] as const) {
    if (!isPositiveInt(box.width) || !isPositiveInt(box.height)) {
      errors.push(validationError(file, key, `declared size ${box.width}×${box.height} must be positive integers`));
    }
  }
  if (errors.length > 0) return errors;
  // BigInt keeps the products exact even when they exceed 2^53.
  if (BigInt(before.width) * BigInt(after.height) !== BigInt(after.width) * BigInt(before.height)) {
    errors.push(
      validationError(
        file,
        "",
        `hookBefore (${before.width}×${before.height}) and hookAfter (${after.width}×${after.height}) aspect ratios differ`,
      ),
    );
  }
  return errors;
}

export function hookAspect(content: Pick<Content, "hookImages">): ValidationError[] {
  const { hookBefore, hookAfter } = content.hookImages;
  return checkHookAspect(hookBefore, hookAfter);
}
