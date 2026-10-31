// Unit tests for the Intro_Screen Typewriter (Req 9.2, 9.3, 9.11). These cover the accessibility
// contract that the main IntroScreen test does not: under full motion the per-character animated
// text is hidden from assistive tech (`aria-hidden`) while the three complete lines are exposed as
// static `sr-only` text (Req 9.11); under reduced motion the three lines render as plain static
// text with no caret or animation (Req 9.3). The typing math itself is property-tested in
// `lib/motion.ts`; here we only assert what the DOM exposes to a screen reader.
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Typewriter } from "./Typewriter";

const LINES = ["Data pipelines.", "Trusted decisions.", "Analysis-ready data."] as const;

/** Stubs `prefers-reduced-motion` so the motion store reports the chosen mode. */
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

beforeEach(() => {
  stubReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Typewriter under full motion", () => {
  it("exposes the three complete lines to assistive tech as static sr-only text", () => {
    render(<Typewriter lines={LINES} />);

    // The sr-only node carries every full line verbatim, joined, so a screen reader reads the
    // complete phrases rather than any partial typed state (Req 9.11).
    const srText = `${LINES[0]}. ${LINES[1]}. ${LINES[2]}`;
    const srNode = screen.getByText(srText);
    expect(srNode).toBeInTheDocument();
    expect(srNode).toHaveClass("sr-only");
  });

  it("hides the animated per-character text (and caret) from the accessibility tree", () => {
    const { container } = render(<Typewriter lines={LINES} />);

    // The visual span that carries the typed characters is aria-hidden; so is its blinking caret,
    // so no intermediate character is ever announced (Req 9.11).
    const hidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThan(0);

    // The sr-only complete text is NOT inside any aria-hidden subtree.
    const srText = `${LINES[0]}. ${LINES[1]}. ${LINES[2]}`;
    const srNode = screen.getByText(srText);
    expect(srNode.closest('[aria-hidden="true"]')).toBeNull();
  });

  it("drives the visible line from the start frame as real time advances", () => {
    vi.useFakeTimers();
    // Make rAF fire deterministically off the fake clock.
    const rafSpy = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) =>
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
    );

    const { container } = render(<Typewriter lines={LINES} />);

    // At the start frame the animated span is empty apart from the caret; after time passes the
    // first line begins to appear, character by character, in the aria-hidden span.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    const animated = container.querySelector('p span[aria-hidden="true"]');
    expect(animated).not.toBeNull();
    // Some prefix of the first line is now typed into the visual-only span.
    expect(animated?.textContent ?? "").toContain(LINES[0].slice(0, 1));

    rafSpy.mockRestore();
  });
});

describe("Typewriter under reduced motion", () => {
  beforeEach(() => {
    stubReducedMotion(true);
  });

  it("renders the three lines as plain static text in order", () => {
    render(<Typewriter lines={LINES} />);

    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([...LINES]);
  });

  it("shows no blinking caret and no aria-hidden animated span", () => {
    const { container } = render(<Typewriter lines={LINES} />);

    // No pipe caret and no aria-hidden visual span in the reduced tree.
    expect(container.textContent).not.toContain("|");
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    // Each line is directly in the accessibility tree (not sr-only, not duplicated).
    for (const line of LINES) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });
});
