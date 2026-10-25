// URL helpers for Base_Path and Site_Origin handling (Req 2.3, 2.4, 2.8).
// Pure functions: they are shared by the browser bundle, the Vite config and build plugins.

/** Default Site_Origin: the GitHub Pages user site of AishvaryaRamesh08 (Req 2.8). */
export const DEFAULT_SITE_ORIGIN = "https://aishvaryaramesh08.github.io";

/**
 * Normalizes a Base_Path to exactly one leading and one trailing "/", collapsing repeated slashes.
 * Empty or whitespace-only input yields "/".
 *
 * normalizeBase("portfolio")    === "/portfolio/"
 * normalizeBase("/a//b")        === "/a/b/"
 * normalizeBase(undefined)      === "/"
 */
export function normalizeBase(base: string | undefined | null): string {
  const segments = (base ?? "")
    .trim()
    .split("/")
    .filter((segment) => segment.length > 0);
  return segments.length === 0 ? "/" : `/${segments.join("/")}/`;
}

/** Removes trailing slashes from an origin so it can be joined with a base that starts with "/". */
export function normalizeOrigin(origin: string | undefined | null): string {
  const trimmed = (origin ?? "").trim().replace(/\/+$/, "");
  return trimmed.length === 0 ? DEFAULT_SITE_ORIGIN : trimmed;
}

/**
 * True exactly when `s` is an absolute URL whose protocol is `https:` (Req 18.4, Property 44).
 * `undefined`, empty, and relative or non-https values are false. Parsing follows the WHATWG
 * `URL` constructor, so a malformed value throws internally and is reported as false.
 *
 * isHttpsUrl("https://example.com/x") === true
 * isHttpsUrl("http://example.com")    === false
 * isHttpsUrl("example.com")           === false
 * isHttpsUrl(undefined)               === false
 */
export function isHttpsUrl(s: string | undefined): boolean {
  if (s === undefined || s.length === 0) return false;
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
}

/** Strips leading slashes so a path is always resolved relative to the base. */
function relativePath(path: string): string {
  return path.replace(/^\/+/, "");
}

/**
 * Prefixes a site-relative path with the Base_Path, e.g. withBase("data/ohlc-sample.json")
 * → "/portfolio/data/ohlc-sample.json" when built with VITE_BASE_PATH=/portfolio/.
 * Defaults to Vite's resolved BASE_URL.
 */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  return normalizeBase(base) + relativePath(path);
}

/**
 * Builds an absolute URL from the Site_Origin, the Base_Path and an optional relative path:
 * absoluteUrl("https://aishvaryaramesh08.github.io", "/", "sitemap.xml")
 * → "https://aishvaryaramesh08.github.io/sitemap.xml".
 */
export function absoluteUrl(origin: string, base: string, path: string = ""): string {
  return normalizeOrigin(origin) + withBase(path, base);
}
