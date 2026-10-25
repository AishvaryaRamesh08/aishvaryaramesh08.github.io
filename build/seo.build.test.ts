// @vitest-environment node
// Fixture builds with the real vite.config.ts: 404.html is emitted and links to the active
// Base_Path, for the default "/" and an overridden "/portfolio/" (Req 2.3, 2.4, 2.5, 2.8).
// Only the client build runs; the SSR build and prerender step are not needed for 404.html.
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "vite";
import { afterAll, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(join(tmpdir(), "portfolio-seo-build-"));
const BUILD_TIMEOUT_MS = 120_000;

/** Runs the client build into a temp outDir with `VITE_BASE_PATH` set (or unset), then restores it. */
async function fixtureBuild(name: string, basePath: string | undefined): Promise<string> {
  const outDir = join(tempRoot, name);
  const previous = process.env.VITE_BASE_PATH;
  if (basePath === undefined) delete process.env.VITE_BASE_PATH;
  else process.env.VITE_BASE_PATH = basePath;
  try {
    await build({
      root,
      configFile: resolve(root, "vite.config.ts"),
      mode: "production",
      logLevel: "silent",
      build: { outDir, emptyOutDir: true },
    });
  } finally {
    if (previous === undefined) delete process.env.VITE_BASE_PATH;
    else process.env.VITE_BASE_PATH = previous;
  }
  return outDir;
}

function anchorHrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]);
}

afterAll(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

describe("404.html in the build output", () => {
  it(
    "is emitted at the output root and links to the default Base_Path",
    async () => {
      const outDir = await fixtureBuild("default", undefined);
      const notFound = join(outDir, "404.html");
      expect(existsSync(notFound)).toBe(true);
      expect(anchorHrefs(readFileSync(notFound, "utf8"))).toEqual(["/"]);
      // Index assets use the same base; no custom domain file is emitted (Req 2.8).
      expect(readFileSync(join(outDir, "index.html"), "utf8")).toMatch(/src="\/assets\//);
      expect(existsSync(join(outDir, "CNAME"))).toBe(false);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    "links to an overridden Base_Path such as /portfolio/",
    async () => {
      const outDir = await fixtureBuild("portfolio", "/portfolio/");
      const notFound = join(outDir, "404.html");
      expect(existsSync(notFound)).toBe(true);
      expect(anchorHrefs(readFileSync(notFound, "utf8"))).toEqual(["/portfolio/"]);
      expect(readFileSync(join(outDir, "index.html"), "utf8")).toMatch(/src="\/portfolio\/assets\//);
    },
    BUILD_TIMEOUT_MS,
  );
});
