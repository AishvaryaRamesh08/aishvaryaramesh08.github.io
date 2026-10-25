// @vitest-environment node
// Token contrast check (Req 28.1, 28.2, 28.5): parses the color tokens from src/styles/tokens.css
// for both Themes and checks every text/background and control-boundary pair with the WCAG 2.x
// relative-luminance formula.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokensCss = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

type Tokens = Record<string, string>;

/** Custom properties declared in the first rule whose selector matches `selector`. */
function declarations(selector: RegExp): Tokens {
  const body = new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`).exec(tokensCss)?.[1];
  if (body === undefined) throw new Error(`rule ${selector.source} not found in tokens.css`);
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const dark = declarations(/:root,\s*:root\.dark/);
// `html.light` only overrides theme-dependent tokens; anything else cascades from the dark rule.
const light = { ...dark, ...declarations(/:root\.light/) };
const themes: [string, Tokens][] = [
  ["dark", dark],
  ["light", light],
];

/** sRGB channel values (0–255) from a #rgb or #rrggbb token. */
function parseHex(value: string): [number, number, number] {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1];
  if (!hex) throw new Error(`expected an opaque hex color, got "${value}"`);
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG 2.x relative luminance. */
function relativeLuminance(value: string): number {
  const [r, g, b] = parseHex(value).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1 to 21. */
function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const BACKGROUNDS = ["--color-base", "--color-surface", "--color-surface-2"];
const TEXT = ["--color-text", "--color-text-muted", "--color-cyan-text", "--color-violet-text", "--color-green-text"];
const CONTROL = ["--color-border-strong", "--color-focus"];

/** Every failing pair, reported with its measured ratio. */
function failures(tokens: Tokens, foregrounds: string[], min: number): string[] {
  return foregrounds.flatMap((fg) =>
    BACKGROUNDS.flatMap((bg) => {
      const ratio = contrastRatio(tokens[fg], tokens[bg]);
      return ratio >= min ? [] : [`${fg} on ${bg}: ${ratio.toFixed(2)}:1 < ${min}:1`];
    }),
  );
}

describe("WCAG contrast helper", () => {
  it("matches known reference ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "#fff")).toBe(1);
    // #767676 on white is the classic 4.54:1 boundary gray.
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

describe.each(themes)("%s Theme tokens", (_name, tokens) => {
  it("define every checked color as an opaque hex value", () => {
    for (const token of [...BACKGROUNDS, ...TEXT, ...CONTROL]) expect(() => parseHex(tokens[token] ?? "")).not.toThrow();
  });

  it("give normal text at least 4.5:1 on every background (Req 28.1)", () => {
    expect(failures(tokens, TEXT, 4.5)).toEqual([]);
  });

  it("give control boundaries and the focus ring at least 3:1 on every background (Req 28.2, 28.5)", () => {
    expect(failures(tokens, CONTROL, 3)).toEqual([]);
  });
});

