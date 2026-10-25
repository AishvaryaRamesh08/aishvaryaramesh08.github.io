/**
 * Resolves Content_Config asset paths to bundled URLs (Req 4.1, 30.3).
 *
 * Asset root: `/src/assets/`. Content entries reference files relative to it, e.g.
 * `"diagrams/migration.svg"` → `/src/assets/diagrams/migration.svg`. Supported extensions: WebP and AVIF
 * (raster, Req 30.3), SVG (diagrams, artifacts, logos), and WebM/MP4 (Viz_Stage recordings).
 *
 * `import.meta.glob` with `query: "?url"` bundles only URL strings (Vite emits each matched file
 * as a hashed asset); the browser fetches an image only when it is actually rendered. The glob is
 * a Vite transform, so it works the same in the client build, the SSR build and Vitest.
 */
import { ASSET_ROOT, normalizeAssetPath } from "../lib/assetPath";
import type { AssetPath, VideoPath } from "./types";

export { ASSET_ROOT, normalizeAssetPath };

export type ResolvablePath = AssetPath | VideoPath;

export interface AssetResolver {
  /** Bundled URL for `path`, or `undefined` when no such file exists under the asset root. */
  tryResolve(path: string): string | undefined;
  /** Bundled URL for `path`; throws `UnknownAssetError` when the file does not exist. */
  resolve(path: ResolvablePath): string;
  /** Every known path, relative to the asset root, sorted. */
  paths(): string[];
}

export class UnknownAssetError extends Error {
  readonly path: string;
  constructor(path: string) {
    super(`Unknown asset "${path}": no file at ${ASSET_ROOT}${normalizeAssetPath(path)}`);
    this.name = "UnknownAssetError";
    this.path = path;
  }
}

/**
 * Builds a resolver from a glob result keyed by absolute module id (`/src/assets/...`).
 * Pure, so it can be tested without the file system.
 */
export function createAssetResolver(modules: Readonly<Record<string, string>>, root: string = ASSET_ROOT): AssetResolver {
  const table = new Map<string, string>();
  for (const [id, url] of Object.entries(modules)) {
    if (!id.startsWith(root)) continue;
    table.set(id.slice(root.length), url);
  }
  return {
    tryResolve: (path) => table.get(normalizeAssetPath(path)),
    resolve(path) {
      const url = table.get(normalizeAssetPath(path));
      if (url === undefined) throw new UnknownAssetError(path);
      return url;
    },
    paths: () => [...table.keys()].sort(),
  };
}

const modules = import.meta.glob<string>("/src/assets/**/*.{webp,avif,svg,webm,mp4}", {
  eager: true,
  query: "?url",
  import: "default",
});

/** Resolver over every file under `/src/assets/`. */
export const assets: AssetResolver = createAssetResolver(modules);

/** Bundled URL for a Content_Config asset path; throws `UnknownAssetError` for unknown paths. */
export const resolveAsset = (path: ResolvablePath): string => assets.resolve(path);

/** Bundled URL for a Content_Config asset path, or `undefined` for unknown paths. */
export const tryResolveAsset = (path: string): string | undefined => assets.tryResolve(path);
