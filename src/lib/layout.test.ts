// Example tests for fitToViewport (the property test is task 5.11).
import { describe, expect, it } from "vitest";
import { fitToViewport } from "./layout";

describe("fitToViewport", () => {
  it("is height-limited for a wide viewport and keeps the aspect ratio", () => {
    const box = fitToViewport({ width: 800, height: 600 }, { width: 1600, height: 900 }, 50);
    expect(box.height).toBe(800);
    expect(box.width).toBeCloseTo(1066.667, 3);
  });

  it("is width-limited for a narrow viewport and scales up a small artifact", () => {
    expect(fitToViewport({ width: 200, height: 100 }, { width: 390, height: 844 }, { x: 15, y: 64 })).toEqual({
      width: 360,
      height: 180,
    });
  });

  it("returns an empty box for invalid sizes or when padding leaves no room", () => {
    expect(fitToViewport({ width: 0, height: 100 }, { width: 800, height: 600 })).toEqual({ width: 0, height: 0 });
    expect(fitToViewport({ width: 100, height: 100 }, { width: 100, height: 600 }, 60)).toEqual({ width: 0, height: 0 });
  });
});
