/**
 * Final build step: the published home page is the hand-built page in site/index.html.
 * Runs after the client build and prerender, and replaces dist/index.html with it, so the
 * deploy workflow (which uploads dist/) ships that page. The React app under src/ still
 * builds and is still checked, but is no longer the page visitors see.
 *
 * Usage (via `npm run build`): tsx scripts/use-static-site.ts
 */
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "site/index.html");
const target = resolve(root, "dist/index.html");

if (!existsSync(source)) {
  console.error(`use-static-site: ${source} not found`);
  process.exitCode = 1;
} else if (!existsSync(resolve(root, "dist"))) {
  console.error("use-static-site: dist/ not found; run the client build first");
  process.exitCode = 1;
} else {
  copyFileSync(source, target);
  console.log("use-static-site: dist/index.html replaced with site/index.html");
}
