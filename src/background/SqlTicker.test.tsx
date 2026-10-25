// Unit tests for the SQL_Ticker (Req 6.7, 6.8, 6.10, 6.11). The ticker shows SQL/pipeline
// snippets in JetBrains Mono at an opacity clamped to the 0.05–0.08 band, only in seams and the
// side gutters (never over body text); `rotateSnippets` offsets neighbouring lanes and
// `tickerDurationSeconds` derives a loop time from the snippet lengths.
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { background } from "../data/background";
import {
  rotateSnippets,
  SqlTickerGutters,
  SqlTickerProvider,
  SqlTickerTrack,
  TICKER_OPACITY,
  tickerDurationSeconds,
} from "./SqlTicker";
import { TickerSeam } from "../components/TickerSeam";
import { TICKER_OPACITY_RANGE } from "./scene";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The four snippets Req 6.7 requires the ticker to include. */
const REQUIRED_SNIPPETS = [
  "SELECT * FROM raw.orders;",
  "MERGE INTO conformed.customers;",
  "DAG: ingest >> clean >> validate >> load;",
  "vector_index.upsert()",
];

describe("TICKER_OPACITY", () => {
  it("stays inside the 0.05–0.08 band (Req 6.7)", () => {
    expect(TICKER_OPACITY).toBeGreaterThanOrEqual(TICKER_OPACITY_RANGE[0]);
    expect(TICKER_OPACITY).toBeLessThanOrEqual(TICKER_OPACITY_RANGE[1]);
    // The configured value (0.06) is already in band, so it passes through unchanged.
    expect(TICKER_OPACITY).toBe(background.ticker.opacity);
  });
});

describe("rotateSnippets", () => {
  const snippets = ["a", "b", "c", "d"];

  it("rotates by the offset modulo the length", () => {
    expect(rotateSnippets(snippets, 0)).toEqual(["a", "b", "c", "d"]);
    expect(rotateSnippets(snippets, 1)).toEqual(["b", "c", "d", "a"]);
    expect(rotateSnippets(snippets, 3)).toEqual(["d", "a", "b", "c"]);
    // Offsets wrap, so neighbouring seams never run off the end of the list.
    expect(rotateSnippets(snippets, 5)).toEqual(["b", "c", "d", "a"]);
  });

  it("keeps the same multiset of snippets", () => {
    expect([...rotateSnippets(snippets, 2)].sort()).toEqual([...snippets].sort());
  });

  it("returns an empty list unchanged", () => {
    expect(rotateSnippets([], 3)).toEqual([]);
  });
});

describe("tickerDurationSeconds", () => {
  it("grows with total snippet length and never drops below the floor", () => {
    const short = tickerDurationSeconds(["x"], background.ticker.speedPxPerSec);
    const long = tickerDurationSeconds(
      ["a very long sql statement that advances the track further than a short one"],
      background.ticker.speedPxPerSec,
    );
    expect(long).toBeGreaterThan(short);
    // A tiny track is clamped to the 30 s minimum so it never scrolls too fast.
    expect(short).toBeGreaterThanOrEqual(30);
  });

  it("falls back to the floor for a non-positive speed", () => {
    expect(tickerDurationSeconds(["SELECT 1"], 0)).toBe(30);
    expect(tickerDurationSeconds(["SELECT 1"], -5)).toBe(30);
  });
});

describe("SqlTickerTrack", () => {
  it("renders the required snippets in JetBrains Mono at the clamped opacity", () => {
    const { container, getAllByText } = render(<SqlTickerTrack axis="x" offset={0} />);
    const track = container.querySelector("[data-sql-ticker]") as HTMLElement;
    expect(track).not.toBeNull();
    expect(track.style.opacity).toBe(String(TICKER_OPACITY));
    expect(track.className).toContain("font-mono");
    // Each snippet is rendered twice (two copies form one seamless loop).
    for (const snippet of REQUIRED_SNIPPETS) {
      expect(getAllByText(snippet).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("pauses its CSS scroll animation while the tab is hidden (Req 6.10)", () => {
    const visibility = vi.spyOn(document, "visibilityState", "get");

    visibility.mockReturnValue("visible");
    const visibleRender = render(<SqlTickerTrack axis="x" offset={0} />);
    const runningInner = visibleRender.container.querySelector(".sql-ticker-x") as HTMLElement;
    expect(runningInner.style.animationPlayState).toBe("running");
    visibleRender.unmount();

    visibility.mockReturnValue("hidden");
    const hiddenRender = render(<SqlTickerTrack axis="x" offset={0} />);
    const pausedInner = hiddenRender.container.querySelector(".sql-ticker-x") as HTMLElement;
    expect(pausedInner.style.animationPlayState).toBe("paused");
  });

  it("contains no focusable elements and does not intercept pointer input (Req 6.8, 6.13)", () => {
    const { container } = render(<SqlTickerTrack axis="y" offset={0} />);
    expect(container.querySelectorAll("a[href], button, input, [tabindex]")).toHaveLength(0);
    const track = container.querySelector("[data-sql-ticker]") as HTMLElement;
    expect(track.className).toContain("pointer-events-none");
    expect(track.className).toContain("select-none");
  });
});

describe("SqlTickerProvider + TickerSeam", () => {
  it("fills a seam with an aria-hidden ticker track only where the provider supplies one", () => {
    const { container } = render(
      <SqlTickerProvider>
        <TickerSeam sectionId="work" />
      </SqlTickerProvider>,
    );
    const seam = container.querySelector("[data-ticker-seam='work']") as HTMLElement;
    expect(seam.getAttribute("aria-hidden")).toBe("true");
    // The provider renders a horizontal ticker inside the seam.
    expect(seam.querySelector("[data-sql-ticker='x']")).not.toBeNull();
  });

  it("leaves a seam empty (but reserved) without a provider", () => {
    const { container } = render(<TickerSeam sectionId="contact" />);
    const seam = container.querySelector("[data-ticker-seam='contact']") as HTMLElement;
    expect(seam.querySelector("[data-sql-ticker]")).toBeNull();
    // The reserved height is kept so the layout is unchanged.
    expect(seam.style.height).toBe("56px");
  });
});

describe("SqlTickerGutters", () => {
  it("renders two vertical gutter lanes gated to ≥ 1440 px, outside the container", () => {
    const { container } = render(<SqlTickerGutters />);
    const lanes = container.querySelectorAll("[data-sql-ticker='y']");
    expect(lanes).toHaveLength(2);
    for (const lane of lanes) {
      // The lanes only appear at ≥ 1440 px (hidden below) and sit in the side gutters.
      expect(lane.className).toContain("min-[1440px]:flex");
      expect(lane.className).toContain("hidden");
    }
  });
});
