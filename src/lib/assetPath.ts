/**
 * Pure path helpers for Content_Config asset references, shared by the runtime resolver
 * (`src/data/assets.ts`) and the build-time validators (`src/lib/validators/`). No Vite APIs here,
 * so this module also loads in plain Node.
 */

/** Asset root for files imported through Vite. */
export const ASSET_ROOT = "/src/assets/";

/** Strips leading "./" and "/" and an optional "src/assets/" prefix so all spellings map to one key. */
export function normalizeAssetPath(path: string): string {
  let p = path.trim().replace(/^(\.\/)+/, "").replace(/^\/+/, "");
  const root = ASSET_ROOT.slice(1); // "src/assets/"
  if (p.startsWith(root)) p = p.slice(root.length);
  return p;
}

/** Strips leading "./" and "/" and an optional "public/" prefix from a path under `/public/`. */
export function normalizePublicPath(path: string): string {
  let p = path.trim().replace(/^(\.\/)+/, "").replace(/^\/+/, "");
  if (p.startsWith("public/")) p = p.slice("public/".length);
  return p;
}
