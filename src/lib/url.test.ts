import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_ORIGIN, absoluteUrl, normalizeBase, withBase } from "./url";

describe("normalizeBase", () => {
  it.each([
    [undefined, "/"],
    ["", "/"],
    ["  ", "/"],
    ["/", "/"],
    ["portfolio", "/portfolio/"],
    ["/portfolio", "/portfolio/"],
    ["portfolio/", "/portfolio/"],
    ["//a//b//", "/a/b/"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeBase(input)).toBe(expected);
  });
});

describe("withBase", () => {
  it("prefixes paths with the given base and drops leading slashes", () => {
    expect(withBase("data/ohlc-sample.json", "/portfolio/")).toBe("/portfolio/data/ohlc-sample.json");
    expect(withBase("/resume/cv.pdf", "portfolio")).toBe("/portfolio/resume/cv.pdf");
    expect(withBase("", "/")).toBe("/");
  });

  it("defaults to Vite's BASE_URL", () => {
    expect(withBase("x.json")).toBe(`${import.meta.env.BASE_URL}x.json`);
  });
});

describe("absoluteUrl", () => {
  it("joins origin, base and path", () => {
    expect(absoluteUrl(DEFAULT_SITE_ORIGIN, "/")).toBe("https://aishvaryaramesh08.github.io/");
    expect(absoluteUrl("https://example.pages.dev/", "/portfolio/", "sitemap.xml")).toBe(
      "https://example.pages.dev/portfolio/sitemap.xml",
    );
  });
});
