// Unit tests: the pre-paint head script from index.html, executed in jsdom (Req 5.1, 5.4, 5.5),
// and the Theme toggle adopting the class it sets (Req 5.3).
// Property 34 (src/lib/theme.property.test.ts) covers the resolution rule against a stub document;
// here the real script runs against jsdom's document, localStorage and timers.
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import indexHtml from "../../index.html?raw";

/** The first inline <script> in <head> (the pre-paint Theme script). */
function inlineThemeScript(): string {
  const match = /<head>\s*<script>([\s\S]*?)<\/script>/.exec(indexHtml);
  if (!match) throw new Error("inline head script is not the first <head> element in index.html");
  return match[1];
}

/** Executes the script in the global (jsdom) scope, as the browser would. */
function runInlineScript(): void {
  new Function(inlineThemeScript())();
}

/**
 * A matchMedia mock where the OS prefers the light color scheme (which the script must ignore)
 * and reduced motion is `reducedMotion`.
 */
function stubMatchMedia(reducedMotion = false) {
  const matchMedia = vi.fn(
    (query: string) =>
      ({
        media: query,
        matches: query.includes("prefers-color-scheme: light") || (reducedMotion && query.includes("reduce")),
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
  vi.stubGlobal("matchMedia", matchMedia);
  return matchMedia;
}

const root = document.documentElement;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  root.className = "";
  root.removeAttribute("style");
  root.removeAttribute("data-motion");
  delete window.__hydrated;
});

describe("inline head Theme script", () => {
  it("applies dark on a first visit even when prefers-color-scheme is light", () => {
    const matchMedia = stubMatchMedia();
    runInlineScript();

    expect(root).toHaveClass("dark", "js");
    expect(root).not.toHaveClass("light");
    expect(root.style.colorScheme).toBe("dark");
    expect(root.dataset.motion).toBeUndefined();
    for (const [query] of matchMedia.mock.calls) expect(query).not.toContain("prefers-color-scheme");
  });

  it("honors a stored light Theme before first paint", () => {
    stubMatchMedia();
    localStorage.setItem("theme", "light");
    runInlineScript();

    expect(root).toHaveClass("light", "js");
    expect(root).not.toHaveClass("dark");
    expect(root.style.colorScheme).toBe("light");
  });

  it("falls back to dark for an unrecognised stored value", () => {
    stubMatchMedia();
    localStorage.setItem("theme", "Light");
    runInlineScript();
    expect(root).toHaveClass("dark");
    expect(root).not.toHaveClass("light");
  });

  it("falls back to dark without throwing when storage access throws", () => {
    stubMatchMedia();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    expect(runInlineScript).not.toThrow();
    expect(root).toHaveClass("dark", "js");
    expect(root.style.colorScheme).toBe("dark");
  });

  it("sets data-motion=reduced for a reduced-motion visitor, and survives a missing matchMedia", () => {
    stubMatchMedia(true);
    runInlineScript();
    expect(root.dataset.motion).toBe("reduced");

    root.removeAttribute("data-motion");
    vi.stubGlobal("matchMedia", undefined);
    expect(runInlineScript).not.toThrow();
    expect(root.dataset.motion).toBeUndefined();
    expect(root).toHaveClass("dark");
  });

  it("removes the js class after 4 s unless the app has hydrated", () => {
    vi.useFakeTimers();
    stubMatchMedia();
    runInlineScript();
    vi.advanceTimersByTime(3999);
    expect(root).toHaveClass("js");
    vi.advanceTimersByTime(1);
    expect(root).not.toHaveClass("js");

    root.className = "";
    runInlineScript();
    window.__hydrated = true;
    vi.advanceTimersByTime(4000);
    expect(root).toHaveClass("js");
  });

  it.each([
    ["dark", null, "Switch to light theme"],
    ["light", "light", "Switch to dark theme"],
  ])("leaves a %s page whose toggle is named for the other Theme", async (_theme, stored, name) => {
    stubMatchMedia();
    if (stored) localStorage.setItem("theme", stored);
    runInlineScript();

    // Fresh modules: the Theme store adopts the class the script set.
    const { ThemeProvider } = await import("../hooks/ThemeProvider");
    const { ThemeToggle } = await import("../layout/ThemeToggle");
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName(name);
  });
});
