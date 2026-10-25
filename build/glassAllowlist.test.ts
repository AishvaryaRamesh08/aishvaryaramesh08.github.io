// @vitest-environment node
// Glass/glow allowlist (Req 5.11): the `glass` and `glow-border` utilities appear only in
// GlassCard (the component that allowlisted elements render through) and, elsewhere, only behind
// an interactive-state variant (hover, keyboard focus or pressed).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

/**
 * Files allowed to apply the utilities unconditionally. Header.tsx: Req 5.11 allowlists the
 * Navbar's glass background while it is solid (Req 7.8); it applies `glass` only in that state.
 */
const ALLOWED_FILES = new Set(["src/components/GlassCard.tsx", "src/layout/Header.tsx"]);

/** Tailwind variants that count as an interactive state (hover, keyboard focus, pressed). */
const STATE_VARIANTS = new Set([
  "hover",
  "focus-visible",
  "active",
  "group-hover",
  "group-focus-visible",
  "peer-hover",
  "peer-focus-visible",
  "aria-pressed",
]);

/**
 * A `glass` / `glow-border` class token with its optional variant chain (`md:hover:glass`) and
 * Tailwind important marker. A class token is delimited by whitespace, a quote or a backtick, so
 * `GlassCard`, `glassBg`, `--glass-bg`, `glass-border` and `/glass` in a URL never match.
 */
const UTILITY = /(?<=^|[\s"'`])((?:[\w\-[\]=]+:)*)!?(glass|glow-border)!?(?=$|[\s"'`])/gm;

/** Removes block and line comments (not `://` inside URLs), so prose like "glass" is ignored. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Each unconditional (not state-scoped) use of the utilities in `source`. */
function unscopedUses(source: string): string[] {
  return [...stripComments(source).matchAll(UTILITY)]
    .filter((m) => !m[1].split(":").some((variant) => STATE_VARIANTS.has(variant)))
    .map((m) => m[0]);
}

/** Every non-test .ts/.tsx source file under src/, as a POSIX path relative to the repo root. */
function sourceFiles(dir = resolve(root, "src")): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "vendor" || entry.name === "test" ? [] : sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$|\.d\.ts$/.test(entry.name)) return [];
    return [relative(root, path).split(sep).join("/")];
  });
}

describe("glass/glow utility matcher", () => {
  it("flags class tokens, including responsive variants and important markers", () => {
    expect(unscopedUses('className="glass rounded-card"')).toEqual(["glass"]);
    expect(unscopedUses("cx('p-4', glow && 'glow-border')")).toEqual(["glow-border"]);
    expect(unscopedUses("`md:glass !glow-border`")).toEqual(["md:glass", "!glow-border"]);
  });

  it("ignores identifiers, custom properties, comments and state-scoped variants", () => {
    const source = [
      'import { GlassCard } from "../components/GlassCard";',
      "const glassBg = 'var(--glass-bg)'; // not a glass utility",
      "/* glow-border is allowlisted */",
      '<GlassCard className="hover:glow-border focus-visible:glass md:active:glass" />',
      'const url = "https://example.com/glass";',
    ].join("\n");
    expect(unscopedUses(source)).toEqual([]);
  });
});

describe("glass/glow allowlist (Req 5.11)", () => {
  const files = sourceFiles();

  it("GlassCard applies both utilities", () => {
    expect(files).toEqual(expect.arrayContaining([...ALLOWED_FILES]));
    const glassCard = readFileSync(resolve(root, "src/components/GlassCard.tsx"), "utf8");
    expect(unscopedUses(glassCard).sort()).toEqual(["glass", "glow-border"]);
  });

  it("the Navbar applies only `glass`, never `glow-border`", () => {
    const header = readFileSync(resolve(root, "src/layout/Header.tsx"), "utf8");
    expect(unscopedUses(header)).toEqual(["glass"]);
  });

  it("no other source file applies them outside an interactive state", () => {
    const offenders = files
      .filter((file) => !ALLOWED_FILES.has(file))
      .flatMap((file) => unscopedUses(readFileSync(resolve(root, file), "utf8")).map((use) => `${file}: ${use}`));
    expect(offenders).toEqual([]);
  });
});
