// Unit tests for the Intro_Screen StatChip count-up (Req 9.5, 9.6). The chip exposes its exact
// final value to assistive technologies at all times via an `sr-only` copy, while the animated
// number is `aria-hidden`, so a screen reader never hears intermediate counts. The count-up only
// begins once the chip is at least 50% in view (`useInViewOnce({ amount: 0.5 })`) and ends on the
// exact final text. The count-up math is property-tested in `lib/motion.ts`; here we assert the
// visible/hidden split, the 50%-in-view trigger, and the landing value.
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { intro } from "../../data/intro";
import { StatChip } from "./StatChip";

type IOEntry = Pick<IntersectionObserverEntry, "isIntersecting" | "intersectionRatio">;

/** Captured IntersectionObserver so the test can drive intersection ratios by hand. */
let ioCallback: IntersectionObserverCallback = () => {};
let ioOptions: IntersectionObserverInit | undefined;
let ioObserved: Element[] = [];

/** Installs a controllable IntersectionObserver and records the options the hook requested. */
function stubIntersectionObserver() {
  ioObserved = [];
  class IO {
    constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      ioCallback = cb;
      ioOptions = options;
    }
    observe = (el: Element) => {
      ioObserved.push(el);
    };
    unobserve = () => {};
    disconnect = () => {};
    takeRecords = () => [];
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  vi.stubGlobal("IntersectionObserver", IO as unknown as typeof IntersectionObserver);
}

/** Fires the observer callback with a single entry at the given ratio. */
function fireIntersection(entry: IOEntry) {
  act(() => {
    ioCallback([entry as IntersectionObserverEntry], {} as IntersectionObserver);
  });
}

/** Stubs `prefers-reduced-motion`. */
function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      media: query,
      matches: query === "(prefers-reduced-motion: reduce)" && reduced,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })),
  );
}

/** Replaces rAF with the fake-timer clock so count-up frames are deterministic. */
function stubRaf() {
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
    (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number,
  );
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) =>
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
  );
}

const CHIP = intro.chips[1]; // { finalText: "50+", label: "tables migrated to BigQuery" }

beforeEach(() => {
  stubReducedMotion(false);
  stubIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("StatChip accessibility split", () => {
  it("always exposes the exact final value plus label to assistive tech (sr-only)", () => {
    const { container } = render(<StatChip chip={CHIP} />);

    // The stable sr-only copy carries the exact final text and the label from the start, before any
    // count-up runs (Req 9.6, 9.11-style).
    const sr = container.querySelector(".sr-only");
    expect(sr).not.toBeNull();
    expect(sr?.textContent?.replace(/\s+/g, " ").trim()).toBe(`${CHIP.finalText} ${CHIP.label}`);
  });

  it("marks the animated number and its label as aria-hidden", () => {
    const { container } = render(<StatChip chip={CHIP} />);

    const hidden = Array.from(container.querySelectorAll('[aria-hidden="true"]'));
    // Both the number and the visible label are decorative duplicates of the sr-only text.
    expect(hidden.some((el) => (el.textContent ?? "").includes(CHIP.label))).toBe(true);
    // The sr-only node is not inside any aria-hidden subtree.
    const sr = container.querySelector(".sr-only");
    expect(sr?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it("registers the 50%-in-view threshold on its IntersectionObserver", () => {
    render(<StatChip chip={CHIP} />);
    expect(ioObserved).toHaveLength(1);
    expect(ioOptions?.threshold).toBe(0.5);
  });
});

describe("StatChip count-up trigger (Req 9.6)", () => {
  it("does not start the count-up until the chip is at least 50% in view", () => {
    vi.useFakeTimers();
    stubRaf();
    const { container } = render(<StatChip chip={CHIP} />);

    const animated = () => container.querySelector('[aria-hidden="true"]')?.textContent ?? "";

    // Barely visible (below the 0.5 amount) must not latch the count-up.
    fireIntersection({ isIntersecting: true, intersectionRatio: 0.2 });
    act(() => {
      vi.advanceTimersByTime(16);
    });
    // Still showing the final (rest) value, since the one-time count-up has not begun.
    expect(animated()).toBe(CHIP.finalText);

    // Crossing 50% latches in-view and kicks off the count-up from 0.
    fireIntersection({ isIntersecting: true, intersectionRatio: 0.6 });
    act(() => {
      vi.advanceTimersByTime(16);
    });
    // Mid-animation the number is below the final target (prefix/suffix preserved).
    expect(animated()).not.toBe(CHIP.finalText);
    expect(animated().endsWith("+")).toBe(true);
  });

  it("ends exactly on the final text once the count-up window elapses", () => {
    vi.useFakeTimers();
    stubRaf();
    const { container } = render(<StatChip chip={CHIP} />);

    fireIntersection({ isIntersecting: true, intersectionRatio: 0.75 });
    // Run well past the 1.5 s count-up window.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const animated = container.querySelector('[aria-hidden="true"]')?.textContent ?? "";
    expect(animated).toBe(CHIP.finalText);
  });

  it("shows the final value immediately under reduced motion with no count-up", () => {
    stubReducedMotion(true);
    const { container } = render(<StatChip chip={CHIP} />);

    // Even if the chip is in view, reduced motion renders the final text directly (Req 9.6).
    fireIntersection({ isIntersecting: true, intersectionRatio: 0.9 });
    const animated = container.querySelector('[aria-hidden="true"]')?.textContent ?? "";
    expect(animated).toBe(CHIP.finalText);
  });
});
