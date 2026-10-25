// Feature: portfolio-website, Property 33: URLs follow Base_Path and Site_Origin —
// for any valid origin, normalized base path and relative path, withBase returns a path starting
// with the base and absoluteUrl returns exactly origin + base + path.
// (withBase / absoluteUrl part; buildHeadTags is added in task 24.2.)
// **Validates: Requirements 2.3, 2.4**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { absoluteUrl, normalizeBase, withBase } from "./url";

/** URL-safe path segment, e.g. "portfolio", "a-1", "ohlc_sample.json". */
const arbSegment = fc.stringMatching(/^[a-z0-9][a-z0-9._-]{0,11}$/);

/** Normalized Base_Path: "/" or "/seg/…/". */
const arbBase = fc
  .array(arbSegment, { maxLength: 3 })
  .map((segments) => (segments.length === 0 ? "/" : `/${segments.join("/")}/`));

/** Site-relative asset path (no leading slash), possibly empty. */
const arbRelativePath = fc.array(arbSegment, { maxLength: 4 }).map((segments) => segments.join("/"));

/** Valid https origin without trailing slash, optionally with a non-default port. */
const arbOrigin = fc
  .tuple(
    fc.array(fc.stringMatching(/^[a-z][a-z0-9-]{0,9}[a-z0-9]$/), { minLength: 1, maxLength: 3 }),
    fc.stringMatching(/^[a-z]{2,6}$/),
    fc.option(fc.integer({ min: 1024, max: 65535 }), { nil: undefined }),
  )
  .map(([labels, tld, port]) => `https://${[...labels, tld].join(".")}${port === undefined ? "" : `:${port}`}`);

describe("Property 33: URLs follow Base_Path and Site_Origin", () => {
  it("withBase returns base + path, always starting with the base", () => {
    fc.assert(
      fc.property(arbBase, arbRelativePath, (base, path) => {
        const result = withBase(path, base);
        expect(normalizeBase(base)).toBe(base);
        expect(result.startsWith(base)).toBe(true);
        expect(result).toBe(base + path);
      }),
    );
  });

  it("absoluteUrl returns origin + base + path as a parseable absolute URL", () => {
    fc.assert(
      fc.property(arbOrigin, arbBase, arbRelativePath, (origin, base, path) => {
        const result = absoluteUrl(origin, base, path);
        expect(result).toBe(origin + base + path);

        const parsed = new URL(result);
        expect(parsed.origin).toBe(new URL(origin).origin);
        expect(parsed.pathname).toBe(base + path);
      }),
    );
  });
});
