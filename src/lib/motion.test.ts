import { describe, expect, it } from "vitest";
import { intro } from "../data/intro";
import { DEFAULT_TYPE_TIMING, countUpText, typewriterFrame } from "./motion";

describe("typewriterFrame", () => {
  const lines = ["ab", "xyz"] as const;
  const t = { typeMs: 10, holdMs: 100, deleteMs: 5 };
  // Line 0: type 0–20, hold 20–120, delete 120–130. Line 1: type 130–160, hold 160–260, delete 260–275.

  it.each([
    [0, 0, ""],
    [10, 0, "a"],
    [20, 0, "ab"],
    [119, 0, "ab"],
    [125, 0, "a"],
    [130, 1, ""],
    [150, 1, "xy"],
    [200, 1, "xyz"],
    [270, 1, "x"],
    [275, 0, ""],
    [275 + 15, 0, "a"],
  ])("at %d ms shows line %d as %j", (elapsed, lineIndex, text) => {
    expect(typewriterFrame(elapsed, lines, t)).toEqual({ lineIndex, text });
  });

  it("uses the design timing and holds each real line for 2400 ms", () => {
    expect(DEFAULT_TYPE_TIMING).toEqual({ typeMs: 45, holdMs: 2400, deleteMs: 25 });
    const first = intro.typewriterLines[0];
    const typed = first.length * 45;
    expect(typewriterFrame(typed, intro.typewriterLines, DEFAULT_TYPE_TIMING)).toEqual({ lineIndex: 0, text: first });
    expect(typewriterFrame(typed + 2399, intro.typewriterLines, DEFAULT_TYPE_TIMING).text).toBe(first);
  });

  it("slices by code point and handles degenerate input", () => {
    expect(typewriterFrame(10, ["😀b"], t).text).toBe("😀");
    expect(typewriterFrame(-50, lines, t)).toEqual({ lineIndex: 0, text: "" });
    expect(typewriterFrame(Number.NaN, lines, t)).toEqual({ lineIndex: 0, text: "" });
    expect(typewriterFrame(10, [], t)).toEqual({ lineIndex: 0, text: "" });
  });
});

describe("countUpText", () => {
  it("counts the real chips from 0 to their exact final text", () => {
    for (const { finalText } of intro.chips) {
      expect(countUpText(1, finalText)).toBe(finalText);
    }
    expect(countUpText(0, "50+")).toBe("0+");
    expect(countUpText(0.5, "50+")).toBe("25+");
    expect(countUpText(0.99, "4")).toBe("3");
  });

  it("keeps prefix and suffix and clamps progress", () => {
    expect(countUpText(0.5, "~10k users")).toBe("~5k users");
    expect(countUpText(2, "007")).toBe("007");
    expect(countUpText(-1, "3")).toBe("0");
    expect(countUpText(Number.NaN, "3")).toBe("0");
  });

  it("returns non-numeric text unchanged", () => {
    expect(countUpText(0, "many")).toBe("many");
    expect(countUpText(0.5, "")).toBe("");
  });
});
