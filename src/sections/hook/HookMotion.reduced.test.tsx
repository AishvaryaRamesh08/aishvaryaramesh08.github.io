// Task 8.2 — Hook_Screen under Reduced_Motion_Mode (Req 8.13, 8.21).
//
// Covers: with a reduced-motion preference the headline renders both parts in their final, static
// state and the Hook_Arrow renders as a static drawn arrow, both with no entrance animation on
// first render (Req 8.21); and the play-once latch is respected so neither part re-animates when
// the screen re-mounts during the same page load (Req 8.13). Framer Motion is mocked so the
// static-vs-animated decision is observable from the `initial` prop each node is given: our
// components pass `initial={false}` when they render the final state immediately, and an object
// (`{ opacity: 0, ... }` / `{ pathLength: 0 }`) only when they intend to animate from a hidden start.
import { type ReactNode } from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const scrollToSection = vi.hoisted(() => vi.fn());
vi.mock("../../lib/scrollToSection", () => ({ scrollToSection }));

// Record the `initial` prop given to every motion element so a test can assert "no animation".
const initials = vi.hoisted(() => [] as unknown[]);
vi.mock("framer-motion", async () => {
  const { createElement: h } = await import("react");
  const make = (tag: string) =>
    function MotionEl({ initial, children, ...rest }: Record<string, unknown>) {
      initials.push(initial);
      // Drop motion-only props so only valid DOM attributes reach the host element.
      delete rest.animate;
      delete rest.transition;
      return h(tag, rest as Record<string, unknown>, children as ReactNode);
    };
  return { motion: new Proxy({}, { get: (_t, key: string) => make(key) }) };
});

/** matchMedia mock: `(prefers-reduced-motion: reduce)` matches `reduced`; other queries are false. */
function stubMatchMedia(reduced: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(
      (query: string): MediaQueryList =>
        ({
          media: query,
          matches: query === "(prefers-reduced-motion: reduce)" ? reduced : false,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    ),
  );
}

beforeEach(() => {
  initials.length = 0;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  // Clear the play-once latches between tests.
  const { resetArrowPlayed } = await import("./HookArrow");
  const { resetHeadlinePlayed } = await import("./HookHeadline");
  resetArrowPlayed();
  resetHeadlinePlayed();
});

describe("Hook_Screen reduced motion (Req 8.21)", () => {
  it("renders both headline parts and the arrow statically, with no entrance animation", async () => {
    stubMatchMedia(true);
    const { HookHeadline } = await import("./HookHeadline");
    const { HookArrow } = await import("./HookArrow");
    const { hook } = await import("../../data/hook");

    render(
      <>
        <HookHeadline />
        <HookArrow />
      </>,
    );

    // Both headline parts are present in their final text.
    const headline = document.getElementById("hook-headline")!;
    expect(headline.textContent).toContain(hook.headline.before);
    expect(headline.textContent).toContain(hook.headline.after);
    // The arrow renders its final drawn shape.
    expect(document.querySelector("svg")).not.toBeNull();

    // Every motion element opted out of an entrance animation: `initial === false`.
    expect(initials.length).toBeGreaterThan(0);
    for (const initial of initials) expect(initial).toBe(false);
  });
});

describe("Hook_Screen play-once latch (Req 8.13)", () => {
  it("animates on the first full-motion render but stays static on a later re-mount", async () => {
    stubMatchMedia(false);
    const { HookArrow, resetArrowPlayed } = await import("./HookArrow");
    const { HookHeadline, resetHeadlinePlayed } = await import("./HookHeadline");
    resetArrowPlayed();
    resetHeadlinePlayed();

    // First render of the page load: entrance animations run, so some `initial` is an object.
    const first = render(
      <>
        <HookHeadline />
        <HookArrow />
      </>,
    );
    expect(initials.some((i) => typeof i === "object" && i !== null)).toBe(true);
    first.unmount();

    // Re-mount during the same page load: the latch keeps everything static (initial === false).
    initials.length = 0;
    render(
      <>
        <HookHeadline />
        <HookArrow />
      </>,
    );
    expect(initials.length).toBeGreaterThan(0);
    for (const initial of initials) expect(initial).toBe(false);
  });
});
