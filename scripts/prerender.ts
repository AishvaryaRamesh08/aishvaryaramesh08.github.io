/**
 * Build-time prerender (design D1). Runs after the client build (dist/) and the SSR build
 * (dist-ssr/entry-server.js): renders <App /> to HTML, injects it into dist/index.html inside
 * #root, then deletes dist-ssr/ so no server code is ever part of the deployable output.
 *
 * Usage (via `npm run build`): tsx scripts/prerender.ts
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { injectAppHtml } from "../build/prerender.ts";

const root = process.cwd();
const indexPath = resolve(root, "dist/index.html");
const ssrDir = resolve(root, "dist-ssr");
const ssrEntry = resolve(ssrDir, "entry-server.js");

try {
  if (!existsSync(indexPath)) throw new Error(`prerender: ${indexPath} not found; run the client build first`);
  if (!existsSync(ssrEntry)) throw new Error(`prerender: ${ssrEntry} not found; run the SSR build first`);

  const mod: unknown = await import(pathToFileURL(ssrEntry).href);
  const render = (mod as { render?: unknown }).render;
  if (typeof render !== "function") throw new Error("prerender: entry-server does not export render()");

  const appHtml: unknown = render();
  if (typeof appHtml !== "string" || appHtml.length === 0) {
    throw new Error("prerender: render() returned no markup");
  }

  writeFileSync(indexPath, injectAppHtml(readFileSync(indexPath, "utf8"), appHtml));
  console.log(`prerender: injected ${appHtml.length} chars into dist/index.html`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  rmSync(ssrDir, { recursive: true, force: true });
}
