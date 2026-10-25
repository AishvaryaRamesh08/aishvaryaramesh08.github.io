import { describe, expect, expectTypeOf, it } from "vitest";
import { isPlaceholder, skillIds, type Placeholder, type Slot } from "./types";

describe("isPlaceholder", () => {
  it("is true only for objects with placeholder: true", () => {
    expect(isPlaceholder({ placeholder: true, expected: "hookAfter image" })).toBe(true);
    expect(isPlaceholder<string>("I'm a data engineer…")).toBe(false);
    expect(isPlaceholder<string>("")).toBe(false);
    expect(isPlaceholder<readonly string[]>(["paragraph"])).toBe(false);
    expect(isPlaceholder({ src: "hook/after.webp" })).toBe(false);
    expect(isPlaceholder({ placeholder: false, expected: "x" } as unknown as Slot<object>)).toBe(false);
    expect(isPlaceholder(null as unknown as Slot<object>)).toBe(false);
  });

  it("narrows the Slot type", () => {
    const check = (slot: Slot<{ src: string }>) => {
      if (isPlaceholder(slot)) expectTypeOf(slot).toEqualTypeOf<Placeholder>();
      else expectTypeOf(slot).toEqualTypeOf<{ src: string }>();
    };
    check({ placeholder: true, expected: "resume PDF" });
  });
});

describe("skillIds", () => {
  it("lists each skill once, with BigQuery as a single id", () => {
    expect(new Set(skillIds).size).toBe(skillIds.length);
    expect(skillIds.filter((id) => id === "bigquery")).toHaveLength(1);
    for (const id of skillIds) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
});
