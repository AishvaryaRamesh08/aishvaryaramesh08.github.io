// Unit tests for useActiveNavGroup (Req 7.11).
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useActiveNavGroup } from "./useActiveNavGroup";

function Probe() {
  return <output data-testid="active">{useActiveNavGroup() ?? "none"}</output>;
}

let scroll = 0;

/** Stacks sections in document order with the given heights; rects follow the fake scroll offset. */
function mountPage(layout: Array<[id: string, height: number]>): void {
  let top = 0;
  for (const [id, height] of layout) {
    const section = document.createElement("section");
    section.id = id;
    const docTop = top;
    vi.spyOn(section, "getBoundingClientRect").mockImplementation(
      () => ({ top: docTop - scroll, bottom: docTop + height - scroll }) as DOMRect,
    );
    document.body.append(section);
    top += height;
  }
}

function scrollWindowTo(y: number): void {
  scroll = y;
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  window.dispatchEvent(new Event("scroll"));
}

afterEach(() => {
  scrollWindowTo(0);
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("useActiveNavGroup", () => {
  it("returns the group containing the viewport midpoint, and null over the Hook_Screen and Footer", async () => {
    const half = window.innerHeight / 2;
    mountPage([
      ["hook", 1000],
      ["intro", 800],
      ["work", 1000],
      ["skills", 800],
      ["certifications", 600],
      ["terminal", 800],
      ["journey", 600],
      ["built-with-ai", 800],
      ["analysis", 800],
      ["story", 800],
      ["contact", 600],
      ["site-footer", 400],
    ]);
    render(<Probe />);
    const active = screen.getByTestId("active");

    // Midpoint inside the Hook_Screen.
    await waitFor(() => expect(active).toHaveTextContent("none"));

    // Midpoint inside Work.
    act(() => scrollWindowTo(2300 - half));
    await waitFor(() => expect(active).toHaveTextContent("work"));

    // Midpoint inside Skills.
    act(() => scrollWindowTo(3500 - half));
    await waitFor(() => expect(active).toHaveTextContent("skills"));

    // The Story group remains active at the final story section.
    act(() => scrollWindowTo(7900 - half));
    await waitFor(() => expect(active).toHaveTextContent("story"));

    // Midpoint inside the Footer.
    act(() => scrollWindowTo(8800 - half));
    await waitFor(() => expect(active).toHaveTextContent("none"));
  });
});
