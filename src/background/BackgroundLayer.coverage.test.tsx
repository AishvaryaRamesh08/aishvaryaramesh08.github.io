// Fuller unit coverage for the Background_Layer component (task 7.8), extending the smoke tests in
// BackgroundLayer.test.tsx. Focus areas (Req 6.1, 6.7, 6.11, 6.13, 6.14, 6.15, 28.8):
//   - the accessibility + non-interaction contract (aria-hidden root, fixed/pointer-events-none,
//     no focusables, SVGs focusable="false", canvas aria-hidden),
//   - the SQL_Ticker side-gutter lanes mount with the required snippets,
//   - a failed engine chunk import leaves the layer blank while sibling sections stay intact,
//   - reduced-motion mounts a static layer (no throw, SVG layers present) and switches live.
import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex], canvas[tabindex]";

/** matchMedia mock: `(prefers-reduced-motion: reduce)` is `reduced`; the 768 px query is desktop. */
function stubMatchMedia(reduced: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(
      (query: string): MediaQueryList =>
        ({
          media: query,
          matches: query === "(prefers-reduced-motion: reduce)" ? reduced : false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          onchange: null,
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    ),
  );
}

/** A no-op IntersectionObserver so the Neural_Layer reveal path has something to observe. */
function stubIntersectionObserver(): void {
  class IO {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  vi.stubGlobal("IntersectionObserver", IO as unknown as typeof IntersectionObserver);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("./engine/canvasEngine");
  document.body.innerHTML = "";
});

describe("BackgroundLayer accessibility and non-interaction (Req 6.1, 6.13, 28.8)", () => {
  it("is a fixed, pointer-events-none, aria-hidden layer with no focusable descendants", async () => {
    stubMatchMedia(false);
    stubIntersectionObserver();
    const { BackgroundLayer } = await import("./BackgroundLayer");
    const { container } = render(<BackgroundLayer />);
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());

    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("pointer-events-none");
    expect(root.querySelectorAll(FOCUSABLE)).toHaveLength(0);

    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.getAttribute("focusable")).toBe("false");
    }
    expect(container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("mounts the SQL_Ticker side-gutter lanes with the required snippets", async () => {
    stubMatchMedia(false);
    stubIntersectionObserver();
    const { BackgroundLayer } = await import("./BackgroundLayer");
    const { container, getAllByText } = render(<BackgroundLayer />);
    await waitFor(() => expect(container.querySelectorAll("[data-sql-ticker='y']").length).toBe(2));
    // A required snippet appears (two copies per lane, two lanes).
    expect(getAllByText("SELECT * FROM raw.orders;").length).toBeGreaterThanOrEqual(2);
  });
});

describe("BackgroundLayer reduced motion (Req 6.11, 6.14)", () => {
  it("mounts a static layer without throwing, keeping the SVG layers and no focusables", async () => {
    stubMatchMedia(true);
    stubIntersectionObserver();
    const { BackgroundLayer } = await import("./BackgroundLayer");
    const { container } = render(<BackgroundLayer />);
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(0);
    // The canvas element is still present (the engine draws a single static frame into it).
    expect(container.querySelector("canvas")).not.toBeNull();
  });
});

describe("BackgroundLayer failure isolation (Req 6.15)", () => {
  it("leaves the layer blank and sibling sections intact when the engine chunk fails to import", async () => {
    stubMatchMedia(false);
    stubIntersectionObserver();
    // Force the dynamic import of the engine chunk to reject, as a failed network chunk would.
    vi.doMock("./engine/canvasEngine", () => {
      throw new Error("chunk load failed");
    });
    const { BackgroundLayer } = await import("./BackgroundLayer");

    function Page() {
      return (
        <>
          <BackgroundLayer />
          <main>
            <h1>Readable heading</h1>
            <button type="button">Operable control</button>
          </main>
        </>
      );
    }

    const { container, getByRole } = render(<Page />);
    // Let the idle callback run and the import rejection settle.
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The import failure is swallowed: the SVG layers remain and nothing threw.
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    // Foreground content is fully rendered and operable.
    expect(getByRole("heading", { name: "Readable heading" })).toBeInTheDocument();
    expect(getByRole("button", { name: "Operable control" })).toBeEnabled();
  });

  it("renders null (blank) when the scene subtree throws during render", async () => {
    stubMatchMedia(false);
    stubIntersectionObserver();
    // Make buildScene throw so the ErrorBoundary's null fallback blanks the whole layer.
    vi.doMock("./scene", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./scene")>();
      return { ...actual, buildScene: () => {
        throw new Error("scene build failed");
      } };
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { BackgroundLayer } = await import("./BackgroundLayer");

    const { container } = render(<BackgroundLayer />);
    // The boundary's fallback is null, so the layer renders nothing at all.
    expect(container.firstChild).toBeNull();
    errorSpy.mockRestore();
    vi.doUnmock("./scene");
  });
});
