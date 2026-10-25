import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_ORIGIN } from "../src/lib/url.ts";
import { resolveSiteEnv, siteEnvDefines } from "./env.ts";

describe("resolveSiteEnv", () => {
  it("uses the defaults when no override is set", () => {
    expect(resolveSiteEnv({})).toEqual({ basePath: "/", siteOrigin: DEFAULT_SITE_ORIGIN });
  });

  it("applies and normalizes overrides", () => {
    expect(
      resolveSiteEnv({ VITE_BASE_PATH: "portfolio", VITE_SITE_ORIGIN: "https://example.netlify.app/" }),
    ).toEqual({ basePath: "/portfolio/", siteOrigin: "https://example.netlify.app" });
  });

  it("serializes the resolved values as define constants", () => {
    expect(siteEnvDefines({ basePath: "/portfolio/", siteOrigin: DEFAULT_SITE_ORIGIN })).toEqual({
      __BASE_PATH__: '"/portfolio/"',
      __SITE_ORIGIN__: `"${DEFAULT_SITE_ORIGIN}"`,
    });
  });

  it("injects the constants into code under test", () => {
    expect(__BASE_PATH__).toBe(import.meta.env.BASE_URL);
    expect(__SITE_ORIGIN__).toMatch(/^https:\/\//);
  });
});
