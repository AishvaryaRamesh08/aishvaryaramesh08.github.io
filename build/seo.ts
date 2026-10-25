// SEO Vite plugin. Task 2.1 adds the static not-found page (Req 2.5); head tags, sitemap.xml
// and robots.txt are added in task 24.1.
import type { Plugin } from "vite";
import { normalizeBase } from "../src/lib/url.ts";

export interface SeoPluginOptions {
  /** Active Base_Path (normalized by the plugin, so "/portfolio" and "/portfolio/" are equal). */
  basePath: string;
}

/** Escapes a value for use in HTML text and double-quoted attribute values. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Static, self-contained 404 page: inline CSS only (no scripts, fonts or external assets, so it
 * renders even when the requested path breaks relative URLs), dark Theme colors from the design
 * tokens, and a link to the home page under the active Base_Path. GitHub Pages, Cloudflare Pages
 * and Netlify all serve a root 404.html for unknown paths.
 */
export function render404Html(basePath: string): string {
  const home = escapeHtml(normalizeBase(basePath));
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Page not found · Aishvarya Ramesh</title>
    <style>
      html { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0A0E1A;
        color: #E6EDF7;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        line-height: 1.6;
      }
      main { padding: 2rem; text-align: center; max-width: 36rem; }
      .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #22D3EE; margin: 0; }
      h1 { font-size: clamp(1.75rem, 5vw, 2.5rem); margin: 0.5rem 0 1rem; }
      p { color: #A3B1C6; }
      a {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.75rem 1.25rem;
        min-height: 44px;
        box-sizing: border-box;
        border: 1px solid #5B6B8A;
        border-radius: 10px;
        color: #22D3EE;
        text-decoration: none;
      }
      a:hover { border-color: #22D3EE; }
      a:focus-visible { outline: 2px solid #22D3EE; outline-offset: 2px; }
    </style>
  </head>
  <body>
    <main>
      <p class="code">404 · NOT FOUND</p>
      <h1>This page doesn't exist</h1>
      <p>The link may be broken or the page may have moved.</p>
      <a href="${home}">Go to the home page</a>
    </main>
  </body>
</html>
`;
}

/** Emits `404.html` into the client build output. Skipped for the SSR build (dist-ssr). */
export function seoPlugin(options: SeoPluginOptions): Plugin {
  let isSsrBuild = false;
  return {
    name: "portfolio-seo",
    apply: "build",
    configResolved(config) {
      isSsrBuild = Boolean(config.build.ssr);
    },
    generateBundle() {
      if (isSsrBuild) return;
      this.emitFile({ type: "asset", fileName: "404.html", source: render404Html(options.basePath) });
    },
  };
}
