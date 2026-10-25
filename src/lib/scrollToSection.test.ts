// Unit tests for scrollToSection (Req 7.3, 7.4, 26.3, 28.5).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface TweenCall {
  target: unknown;
  vars: { duration?: number; scrollTo?: Record<string, unknown>; onComplete?: () => void; onInterrupt?: () => void };
  kill: ReturnType<typeof vi.fn>;
}

const gsapMock = vi.hoisted(() => {
  const calls: TweenCall[] = [];
  return {
    calls,
    registerPlugin: vi.fn(),
    to: vi.fn((target: unknown, vars: TweenCall["vars"]) => {
      const call: TweenCall = { target, vars, kill: vi.fn(() => vars.onInterrupt?.()) };
      calls.push(call);
      return { kill: call.kill };
    }),
  };
});

vi.mock("gsap", () => ({ gsap: gsapMock, default: gsapMock }));
vi.mock("gsap/ScrollToPlugin", () => ({ ScrollToPlugin: { name: "ScrollToPlugin" } }));

import { readNavHeight, scrollToSection, SCROLL_DURATION_S } from "./scrollToSection";

function stubMotion(reduced: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      ({
        matches: reduced && query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

/** A section labelled by its h2, positioned `top` px below the viewport top. */
function mountSection(id: string, top: number): { section: HTMLElement; heading: HTMLElement } {
  const section = document.createElement("section");
  section.id = id;
  section.setAttribute("aria-labelledby", `${id}-heading`);
  const heading = document.createElement("h2");
  heading.id = `${id}-heading`;
  heading.tabIndex = -1;
  heading.textContent = id;
  section.append(heading);
  document.body.append(section);
  vi.spyOn(section, "getBoundingClientRect").mockReturnValue({ top, bottom: top + 400 } as DOMRect);
  return { section, heading };
}

let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  gsapMock.calls.length = 0;
  gsapMock.to.mockClear();
  scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  document.documentElement.style.setProperty("--nav-h", "72px");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  document.documentElement.style.removeProperty("--nav-h");
});

describe("readNavHeight", () => {
  it("reads --nav-h in px at call time", () => {
    expect(readNavHeight()).toBe(72);
  });

  it("converts rem against the root font size", () => {
    document.documentElement.style.setProperty("--nav-h", "4rem");
    document.documentElement.style.fontSize = "16px";
    expect(readNavHeight()).toBe(64);
    document.documentElement.style.removeProperty("font-size");
  });

  it("falls back to 64 px when the token is missing", () => {
    document.documentElement.style.removeProperty("--nav-h");
    expect(readNavHeight()).toBe(64);
  });
});

describe("scrollToSection", () => {
  it("jumps instantly under reduced motion, offset by --nav-h, then focuses the heading without scrolling", async () => {
    stubMotion(true);
    const { heading } = mountSection("work", 500);
    const focus = vi.spyOn(heading, "focus");

    await scrollToSection("work");

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 500 - 72, behavior: "instant" });
    expect(gsapMock.to).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(heading);
  });

  it("tweens with ScrollToPlugin for 0.8 s and the --nav-h offset under full motion, focusing on completion", async () => {
    stubMotion(false);
    const { section, heading } = mountSection("skills", 1200);
    const focus = vi.spyOn(heading, "focus");

    const done = scrollToSection("skills");

    expect(gsapMock.registerPlugin).toHaveBeenCalledWith({ name: "ScrollToPlugin" });
    expect(gsapMock.to).toHaveBeenCalledOnce();
    const [call] = gsapMock.calls;
    expect(call.target).toBe(window);
    expect(call.vars.duration).toBe(SCROLL_DURATION_S);
    expect(SCROLL_DURATION_S).toBe(0.8);
    expect(call.vars.scrollTo).toMatchObject({ y: section, offsetY: 72 });
    expect(scrollTo).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();

    call.vars.onComplete?.();
    await done;
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(heading);
  });

  it("supersedes a running tween without focusing the old target", async () => {
    stubMotion(false);
    const first = mountSection("work", 500);
    const second = mountSection("contact", 2000);
    const firstFocus = vi.spyOn(first.heading, "focus");

    const firstDone = scrollToSection("work");
    const secondDone = scrollToSection("contact");
    await firstDone;
    expect(gsapMock.calls[0].kill).toHaveBeenCalled();
    expect(firstFocus).not.toHaveBeenCalled();

    gsapMock.calls[1].vars.onComplete?.();
    await secondDone;
    expect(document.activeElement).toBe(second.heading);
  });

  it("does nothing for an ID that is not on the page", async () => {
    stubMotion(true);
    await scrollToSection("missing");
    expect(scrollTo).not.toHaveBeenCalled();
    expect(gsapMock.to).not.toHaveBeenCalled();
  });
});
