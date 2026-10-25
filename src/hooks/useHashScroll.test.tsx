// Unit tests for useHashScroll (Req 3.4, 3.5).
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SectionId } from "../data/types";

const scrollToSection = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock("../lib/scrollToSection", () => ({ scrollToSection }));

import { parseSectionHash, sectionsUpTo, useHashScroll, type UseHashScrollOptions } from "./useHashScroll";

function Probe(props: UseHashScrollOptions) {
  useHashScroll(props);
  return null;
}

function setHash(hash: string): void {
  window.history.replaceState(null, "", hash === "" ? window.location.pathname : hash);
}

beforeEach(() => {
  vi.useFakeTimers();
  scrollToSection.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  setHash("");
});

describe("parseSectionHash / sectionsUpTo", () => {
  it("accepts known section IDs only", () => {
    expect(parseSectionHash("#work")).toBe("work");
    expect(parseSectionHash("#built-with-ai")).toBe("built-with-ai");
    expect(parseSectionHash("#nope")).toBeNull();
    expect(parseSectionHash("#%E0%A4%A")).toBeNull();
    expect(parseSectionHash("")).toBeNull();
  });

  it("lists every section from the Hook_Screen to the target in page order", () => {
    expect(sectionsUpTo("work")).toEqual(["hook", "intro", "work"]);
    expect(sectionsUpTo("hook")).toEqual(["hook"]);
  });
});

describe("useHashScroll", () => {
  it("ignores an unknown fragment without preloading or scrolling", async () => {
    setHash("#not-a-section");
    const preload = vi.fn(() => Promise.resolve());
    render(<Probe preload={preload} />);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(preload).not.toHaveBeenCalled();
    expect(scrollToSection).not.toHaveBeenCalled();
  });

  it("scrolls to a known fragment only after the sections up to it are ready", async () => {
    setHash("#work");
    let resolvePreload = () => {};
    const preload = vi.fn<(target: SectionId) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolvePreload = resolve;
        }),
    );
    render(<Probe preload={preload} />);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(preload).toHaveBeenCalledExactlyOnceWith("work");
    expect(scrollToSection).not.toHaveBeenCalled();

    resolvePreload();
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(scrollToSection).toHaveBeenCalledExactlyOnceWith("work", { focus: false });
  });

  it("scrolls anyway once the 3 s cap passes", async () => {
    setHash("#contact");
    render(<Probe preload={() => new Promise(() => {})} />);
    await act(() => vi.advanceTimersByTimeAsync(2900));
    expect(scrollToSection).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(scrollToSection).toHaveBeenCalledExactlyOnceWith("contact", { focus: false });
  });

  it("does not scroll after unmounting", async () => {
    setHash("#journey");
    const { unmount } = render(<Probe />);
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(scrollToSection).not.toHaveBeenCalled();
  });
});
