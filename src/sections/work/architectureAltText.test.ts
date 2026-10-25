// Light example tests for the architecture text alternative (Req 12.8). The full property test is
// task 12.5; these cover the contract by example: every component name and the flow direction
// appear, blanks are dropped, and the function never produces an empty string.
import { describe, expect, it } from "vitest";
import { architectureAltText } from "./architectureAltText";

describe("architectureAltText", () => {
  it("names every component and the direction of data flow", () => {
    const text = architectureAltText(["Source", "Raw", "Conformed"], "left to right");
    expect(text).toContain("Source");
    expect(text).toContain("Raw");
    expect(text).toContain("Conformed");
    expect(text).toContain("left to right");
  });

  it("drops blank component entries and the flow when it is empty", () => {
    const text = architectureAltText(["A", "  ", ""], "");
    expect(text).toContain("A");
    expect(text).not.toContain("Data flow");
  });

  it("returns a stable non-empty description with no components or flow", () => {
    expect(architectureAltText([], "").trim().length).toBeGreaterThan(0);
  });
});
