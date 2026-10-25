// Light smoke tests for the Background_Layer (full unit coverage is task 7.8). They check the
// accessibility contract (aria-hidden, no focusables, SVG focusable="false") and that a failed
// engine chunk leaves the layer blank instead of throwing (Req 6.13, 6.15, 28.8).
import { render, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackgroundLayer } from "./BackgroundLayer";

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex], canvas[tabindex]";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("BackgroundLayer", () => {
  it("prerenders a deterministic aria-hidden layer with no focusables (hydration-safe)", () => {
    const html = renderToString(<BackgroundLayer />);
    // Same markup every time (pure scene): safe to hydrate without a mismatch.
    expect(renderToString(<BackgroundLayer />)).toBe(html);
    const host = document.createElement("div");
    host.innerHTML = html;
    const root = host.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelectorAll(FOCUSABLE)).toHaveLength(0);
    // Canvas ships empty (the engine runs only in a client effect).
    expect(host.querySelector("canvas")).not.toBeNull();
  });

  it("mounts an aria-hidden layer with no focusable elements", async () => {
    const { container } = render(<BackgroundLayer />);
    await waitFor(() => expect(container.querySelector("[aria-hidden='true']")).not.toBeNull());

    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelectorAll(FOCUSABLE)).toHaveLength(0);
    // Every SVG opts out of the tab order / a11y tree.
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.getAttribute("focusable")).toBe("false");
    }
    // The canvas is present and hidden from assistive tech.
    const canvas = container.querySelector("canvas");
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
  });

  it("removes the square grid while retaining the database/cloud relationship scene", async () => {
    const { container } = render(<BackgroundLayer />);
    await waitFor(() => expect(container.querySelector("polyline")).not.toBeNull());
    expect(container.querySelector("pattern")).toBeNull();
    expect(container.querySelector("#bg-icon-database")).not.toBeNull();
    expect(container.querySelector("#bg-icon-cloud")).not.toBeNull();
  });

  it("stays blank-but-present when the canvas engine is unavailable", async () => {
    // jsdom has no 2D canvas context, so createCanvasEngine returns null: the SVG layers remain
    // and nothing is thrown (same outcome as a failed engine chunk, Req 6.15).
    const { container } = render(<BackgroundLayer />);
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(0);
  });
});
