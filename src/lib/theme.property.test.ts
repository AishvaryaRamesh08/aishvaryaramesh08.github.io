// Feature: portfolio-website, Property 34: Initial Theme resolution —
// for any stored value (any string, null, or a throwing storage), resolveInitialTheme returns
// "light" only when the stored value is exactly "light" and "dark" otherwise, independent of
// prefers-color-scheme. The inline head script in index.html must agree.
// **Validates: Requirements 5.1, 5.5**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import { DEFAULT_THEME, resolveInitialTheme, THEME_STORAGE_KEY, type Theme } from "./theme";

/** Stored values: biased toward the interesting strings, plus arbitrary strings and non-strings. */
const arbStoredString = fc.oneof(
  fc.constantFrom("light", "dark", "Light", "LIGHT", " light", "light ", "", "system", "auto"),
  fc.string(),
);
const arbStoredAny = fc.oneof(
  arbStoredString,
  fc.constant(null),
  fc.constant(undefined),
  fc.anything().filter((v) => typeof v !== "function"),
);

const expected = (value: unknown): Theme => (value === "light" ? "light" : "dark");

/** The first inline <script> in <head> (the pre-paint Theme script). */
function inlineThemeScript(): string {
  const match = /<head>[\s\S]*?<script>([\s\S]*?)<\/script>/.exec(indexHtml);
  if (!match) throw new Error("inline head script not found in index.html");
  return match[1];
}

/**
 * Runs the inline script against a stub document/localStorage/matchMedia and returns the Theme
 * class it applied. `prefersLight` drives every matchMedia query to prove the script ignores it.
 */
function runInlineScript(getItem: (key: string) => string | null, prefersLight: boolean): string[] {
  const classes = new Set<string>();
  const documentElement = {
    classList: {
      add: (...names: string[]) => names.forEach((n) => classes.add(n)),
      remove: (...names: string[]) => names.forEach((n) => classes.delete(n)),
    },
    style: {} as Record<string, string>,
    dataset: {} as Record<string, string>,
  };
  const run = new Function("document", "localStorage", "matchMedia", "setTimeout", "window", inlineThemeScript());
  run(
    { documentElement },
    { getItem },
    (query: string) => ({ matches: query.includes("prefers-color-scheme") ? prefersLight : false }),
    () => 0,
    {},
  );
  const applied = [...classes].filter((c) => c === "light" || c === "dark");
  expect(documentElement.style.colorScheme).toBe(applied[0]);
  return applied;
}

describe("Property 34: Initial Theme resolution", () => {
  it("exports the shared storage key and dark default", () => {
    expect(THEME_STORAGE_KEY).toBe("theme");
    expect(DEFAULT_THEME).toBe("dark");
  });

  it('returns "light" only for exactly "light", "dark" for any other stored value', () => {
    fc.assert(
      fc.property(arbStoredAny, (stored) => {
        expect(resolveInitialTheme(stored)).toBe(expected(stored));
      }),
    );
  });

  it("applies the same rule to a storage reader, and a throwing reader yields dark", () => {
    fc.assert(
      fc.property(arbStoredAny, fc.boolean(), (stored, throws) => {
        const reader = () => {
          if (throws) throw new DOMException("denied", "SecurityError");
          return stored;
        };
        expect(resolveInitialTheme(reader)).toBe(throws ? "dark" : expected(stored));
      }),
    );
  });

  it("inline head script agrees with resolveInitialTheme, regardless of prefers-color-scheme", () => {
    fc.assert(
      fc.property(fc.option(arbStoredString, { nil: null }), fc.boolean(), fc.boolean(), (stored, throws, prefersLight) => {
        const getItem = (key: string) => {
          if (throws) throw new DOMException("denied", "SecurityError");
          return key === THEME_STORAGE_KEY ? stored : null;
        };
        const applied = runInlineScript(getItem, prefersLight);
        expect(applied).toEqual([resolveInitialTheme(() => getItem(THEME_STORAGE_KEY))]);
      }),
    );
  });
});
