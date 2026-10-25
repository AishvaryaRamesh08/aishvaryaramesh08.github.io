/** Joins class names, skipping falsy parts. Pure and SSR-safe. */
export function cx(...parts: readonly (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
