import { describe, expect, it } from "vitest";
import {
  ASSET_ROOT,
  UnknownAssetError,
  assets,
  createAssetResolver,
  normalizeAssetPath,
  resolveAsset,
  tryResolveAsset,
} from "./assets";

const glob = {
  "/src/assets/preview/sample.webp": "/assets/sample-abc123.webp",
  "/src/assets/diagrams/migration.svg": "/assets/migration-def456.svg",
  "/elsewhere/ignored.webp": "/assets/ignored.webp",
};

describe("normalizeAssetPath", () => {
  it.each([
    ["preview/sample.webp", "preview/sample.webp"],
    ["/preview/sample.webp", "preview/sample.webp"],
    ["./preview/sample.webp", "preview/sample.webp"],
    ["/src/assets/preview/sample.webp", "preview/sample.webp"],
    ["src/assets/preview/sample.webp", "preview/sample.webp"],
  ])("maps %j to %j", (input, expected) => {
    expect(normalizeAssetPath(input)).toBe(expected);
  });
});

describe("createAssetResolver", () => {
  const r = createAssetResolver(glob);

  it("resolves paths relative to the asset root", () => {
    expect(r.resolve("preview/sample.webp")).toBe("/assets/sample-abc123.webp");
    expect(r.tryResolve("/src/assets/diagrams/migration.svg")).toBe("/assets/migration-def456.svg");
  });

  it("lists only files under the root, sorted", () => {
    expect(r.paths()).toEqual(["diagrams/migration.svg", "preview/sample.webp"]);
  });

  it("returns undefined or throws for unknown paths", () => {
    expect(r.tryResolve("hook/missing.webp")).toBeUndefined();
    expect(() => r.resolve("hook/missing.webp")).toThrow(UnknownAssetError);
    expect(() => r.resolve("hook/missing.webp")).toThrow(`${ASSET_ROOT}hook/missing.webp`);
  });
});

describe("assets (real import.meta.glob)", () => {
  it("indexes only supported asset types", () => {
    for (const p of assets.paths()) expect(p).toMatch(/\.(webp|avif|svg|webm|mp4)$/);
  });

  it("rejects paths that are not in the project", () => {
    expect(tryResolveAsset("does-not-exist/nothing.webp")).toBeUndefined();
    expect(() => resolveAsset("does-not-exist/nothing.webp")).toThrow(UnknownAssetError);
  });
});
