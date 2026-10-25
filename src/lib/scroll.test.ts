import { describe, expect, it } from "vitest";
import { site } from "../data/site";
import {
  nextTabIndex,
  progressForStage,
  resolveActiveNavGroup,
  rowsCleanedAtProgress,
  scrollProgress,
  stageAtProgress,
  type SectionRect,
} from "./scroll";

describe("scrollProgress", () => {
  it("maps the top, middle and bottom of the page and clamps overscroll", () => {
    expect(scrollProgress(0, 3000, 1000)).toBe(0);
    expect(scrollProgress(1000, 3000, 1000)).toBe(0.5);
    expect(scrollProgress(2000, 3000, 1000)).toBe(1);
    expect(scrollProgress(-50, 3000, 1000)).toBe(0);
    expect(scrollProgress(2500, 3000, 1000)).toBe(1);
  });

  it("reports 0 for a page that cannot scroll", () => {
    expect(scrollProgress(0, 800, 1000)).toBe(0);
  });
});

describe("resolveActiveNavGroup", () => {
  const rects: SectionRect[] = [
    { id: "hook", top: 0, bottom: 900 },
    { id: "intro", top: 900, bottom: 1500 },
    { id: "story", top: 1500, bottom: 2400 },
    { id: "work", top: 2400, bottom: 3000 },
    { id: "site-footer", top: 3000, bottom: 3200 },
  ];

  it("returns the group of the section containing the midpoint", () => {
    expect(resolveActiveNavGroup(1600, rects, site.navGroups)).toBe("story");
    expect(resolveActiveNavGroup(2400, rects, site.navGroups)).toBe("work");
  });

  it("returns null in the Hook_Screen, the Footer and outside every section", () => {
    expect(resolveActiveNavGroup(100, rects, site.navGroups)).toBeNull();
    expect(resolveActiveNavGroup(3100, rects, site.navGroups)).toBeNull();
    expect(resolveActiveNavGroup(5000, rects, site.navGroups)).toBeNull();
  });
});

describe("stageAtProgress / progressForStage", () => {
  it("maps progress to 0-based stages with the last stage covering p = 1", () => {
    expect([0, 0.24, 0.25, 0.5, 0.75, 1].map((p) => stageAtProgress(p, 4))).toEqual([0, 0, 1, 2, 3, 3]);
    expect([0, 1 / 3, 2 / 3, 1].map((p) => stageAtProgress(p, 3))).toEqual([0, 1, 2, 2]);
  });

  it("round-trips tab targets to their stage", () => {
    for (const n of [3, 4]) {
      for (let k = 1; k <= n; k += 1) {
        expect(stageAtProgress(progressForStage(k, n), n)).toBe(k - 1);
      }
    }
  });
});

describe("rowsCleanedAtProgress", () => {
  it("cleans row k once p reaches k/n", () => {
    expect([0, 0.19, 0.2, 0.5, 0.99, 1, 1.5].map((p) => rowsCleanedAtProgress(p, 5))).toEqual([
      0, 0, 1, 2, 4, 5, 5,
    ]);
    expect(rowsCleanedAtProgress(-1, 5)).toBe(0);
  });
});

describe("nextTabIndex", () => {
  it("moves without wrapping and ignores other keys", () => {
    expect(nextTabIndex("ArrowRight", 1, 4)).toBe(2);
    expect(nextTabIndex("ArrowRight", 3, 4)).toBe(3);
    expect(nextTabIndex("ArrowLeft", 0, 4)).toBe(0);
    expect(nextTabIndex("ArrowLeft", 2, 4)).toBe(1);
    expect(nextTabIndex("Home", 2, 4)).toBe(0);
    expect(nextTabIndex("End", 0, 4)).toBe(3);
    expect(nextTabIndex("Enter", 2, 4)).toBe(2);
  });
});
