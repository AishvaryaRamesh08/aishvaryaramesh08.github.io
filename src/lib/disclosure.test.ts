// Example tests for the disclosure-group reducer. The "at most one expanded" property is
// property-tested in task 5.9 (Property 27).
import { describe, expect, it } from "vitest";
import { disclosureGroupReducer, initialDisclosureGroupState, isExpanded, type DisclosureGroupState } from "./disclosure";

describe("disclosureGroupReducer", () => {
  const start = initialDisclosureGroupState<string>();

  it("starts with everything collapsed", () => {
    expect(start.expandedId).toBeNull();
    expect(isExpanded(start, "raw")).toBe(false);
  });

  it("toggle expands a collapsed item, switches to another, and collapses the expanded one", () => {
    const a = disclosureGroupReducer(start, { type: "toggle", id: "raw" });
    expect(a.expandedId).toBe("raw");
    const b = disclosureGroupReducer(a, { type: "toggle", id: "staging" });
    expect(b.expandedId).toBe("staging");
    expect(isExpanded(b, "raw")).toBe(false);
    const c = disclosureGroupReducer(b, { type: "toggle", id: "staging" });
    expect(c.expandedId).toBeNull();
  });

  it("open, close and collapseAll only change state when needed", () => {
    const opened = disclosureGroupReducer(start, { type: "open", id: "raw" });
    expect(opened.expandedId).toBe("raw");
    expect(disclosureGroupReducer(opened, { type: "open", id: "raw" })).toBe(opened);
    expect(disclosureGroupReducer(opened, { type: "close", id: "other" })).toBe(opened);
    expect(disclosureGroupReducer(opened, { type: "close", id: "raw" }).expandedId).toBeNull();
    expect(disclosureGroupReducer(opened, { type: "collapseAll" }).expandedId).toBeNull();
    expect(disclosureGroupReducer(start, { type: "collapseAll" })).toBe(start);
  });

  it("works with numeric ids", () => {
    const s: DisclosureGroupState<number> = disclosureGroupReducer(initialDisclosureGroupState<number>(), {
      type: "toggle",
      id: 0,
    });
    expect(s.expandedId).toBe(0);
  });
});
