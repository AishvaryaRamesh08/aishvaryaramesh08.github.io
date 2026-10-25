// Static checks on the design-system CSS and font setup (Req 5.1, 5.7, 5.8, 5.9, 26.2, 28.5).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const fontsCss = read("src/styles/fonts.css");
const tokensCss = read("src/styles/tokens.css");
const globalsCss = read("src/styles/globals.css");
const indexHtml = read("index.html");

/** Splits fonts.css into its @font-face blocks. */
const fontFaces = [...fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1] ?? "");
const webFaces = fontFaces.filter((face) => face.includes("url("));
const fallbackFaces = fontFaces.filter((face) => face.includes("local("));

describe("fonts.css", () => {
  it("declares the three self-hosted variable families with font-display: swap", () => {
    const families = webFaces.map((face) => /font-family:\s*"([^"]+)"/.exec(face)?.[1]);
    expect(families).toEqual(["Space Grotesk", "Inter", "JetBrains Mono"]);
    for (const face of webFaces) expect(face).toMatch(/font-display:\s*swap/);
  });

  it("loads every font from an existing same-origin file in public/fonts", () => {
    const urls = webFaces.flatMap((face) => [...face.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1] ?? ""));
    expect(urls).toHaveLength(3);
    for (const url of urls) {
      expect(url).toMatch(/^\/fonts\/[\w-]+\.woff2$/);
      expect(existsSync(resolve(root, "public", url.slice(1)))).toBe(true);
    }
    expect(fontsCss).not.toMatch(/https?:\/\//);
  });

  it("declares a metric-adjusted fallback face for each family, used in the token stacks", () => {
    expect(fallbackFaces).toHaveLength(3);
    for (const face of fallbackFaces) {
      expect(face).toMatch(/size-adjust:\s*[\d.]+%/);
      expect(face).toMatch(/ascent-override:\s*[\d.]+%/);
      expect(face).toMatch(/descent-override:\s*[\d.]+%/);
    }
    expect(tokensCss).toMatch(/--font-heading:\s*"Space Grotesk", "Space Grotesk Fallback",[^;]*sans-serif;/);
    expect(tokensCss).toMatch(/--font-body:\s*"Inter", "Inter Fallback",[^;]*sans-serif;/);
    expect(tokensCss).toMatch(/--font-mono:\s*"JetBrains Mono", "JetBrains Mono Fallback",[^;]*monospace;/);
  });

  it("ships an OFL license next to each font file", () => {
    for (const name of ["SpaceGrotesk", "Inter", "JetBrainsMono"]) {
      expect(read(`public/fonts/OFL-${name}.txt`)).toContain("SIL Open Font License");
    }
  });
});

describe("index.html font preloads", () => {
  const preloads = [...indexHtml.matchAll(/<link rel="preload" href="([^"]+)" as="font"[^>]*>/g)];

  it("preloads Space Grotesk and Inter (not JetBrains Mono) as crossorigin WOFF2", () => {
    expect(preloads.map((m) => m[1])).toEqual([
      "/fonts/space-grotesk-latin-wght-normal.woff2",
      "/fonts/inter-latin-wght-normal.woff2",
    ]);
    for (const [tag] of preloads) {
      expect(tag).toContain('type="font/woff2"');
      expect(tag).toContain("crossorigin");
    }
  });
});

describe("index.html theme script", () => {
  it("is the first <head> element and never reads prefers-color-scheme", () => {
    const head = /<head>([\s\S]*?)<\/head>/.exec(indexHtml)?.[1] ?? "";
    expect(head.trimStart().startsWith("<script>")).toBe(true);
    expect(head).toContain('localStorage.getItem("theme")');
    expect(indexHtml).not.toMatch(/prefers-color-scheme/);
  });
});

describe("tokens.css and globals.css", () => {
  it("defaults to the dark base color and overrides it only under .light", () => {
    expect(tokensCss).toMatch(/:root,\s*:root\.dark\s*\{[^}]*--color-base:\s*#0a0e1a;/i);
    expect(tokensCss).toMatch(/:root\.light\s*\{[^}]*--color-base:\s*#f5f7fb;/i);
    expect(tokensCss + globalsCss).not.toMatch(/@media[^{]*prefers-color-scheme/);
  });

  it("draws a 2 px focus ring with a 2 px offset and pads anchors below the Navbar", () => {
    expect(globalsCss).toMatch(/:focus-visible\s*\{\s*outline:\s*2px solid var\(--color-focus\);\s*outline-offset:\s*2px;/);
    expect(globalsCss).toMatch(/scroll-padding-top:\s*var\(--nav-h\)/);
  });

  it("limits reduced-motion transitions to crossfades of at most 300 ms", () => {
    expect(globalsCss).toMatch(/html\[data-motion="reduced"\] \*[^{]*\{[^}]*animation:\s*none !important;/);
    expect(globalsCss).toMatch(/transition-property:\s*opacity, color, background-color, border-color !important;/);
    const ms = Number(/--duration-reduced:\s*(\d+)ms/.exec(tokensCss)?.[1]);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(300);
  });

  it("hides pre-animation states only under html.js without reduced motion", () => {
    const css = globalsCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const hidingRules = [...css.matchAll(/([^{}]+)\{\s*opacity:\s*0;?\s*\}/g)].map((m) => (m[1] ?? "").trim());
    expect(hidingRules.length).toBeGreaterThan(0);
    for (const selector of hidingRules) expect(selector.startsWith('html.js:not([data-motion="reduced"])')).toBe(true);
  });
});
