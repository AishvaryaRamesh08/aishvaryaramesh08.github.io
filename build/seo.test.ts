import { describe, expect, it } from "vitest";
import { render404Html } from "./seo.ts";

/** All href values of anchor elements in the generated page. */
function anchorHrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]);
}

describe("render404Html", () => {
  it("links to the default Base_Path", () => {
    expect(anchorHrefs(render404Html("/"))).toEqual(["/"]);
  });

  it("links to an overridden Base_Path, normalizing slashes", () => {
    expect(anchorHrefs(render404Html("/portfolio/"))).toEqual(["/portfolio/"]);
    expect(anchorHrefs(render404Html("portfolio"))).toEqual(["/portfolio/"]);
  });

  it("is a static, self-contained page with inline styles only", () => {
    const html = render404Html("/");
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain(`<html lang="en">`);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html.match(/<style>/g)).toHaveLength(1);
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/<link\b/i);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("escapes HTML-significant characters in the base path", () => {
    const html = render404Html(`/a"><script>x</script>/`);
    expect(html).not.toMatch(/<script\b/i);
    expect(anchorHrefs(html)).toHaveLength(1);
  });
});
