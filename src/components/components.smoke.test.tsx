// Smoke tests for the shared UI components (task 5.6). Placeholder labeling is property-tested in
// task 5.7; shell and navigation unit tests live in task 6.10.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { site } from "../data/site";
import { ui } from "../data/ui";
import { CodeBlock } from "./CodeBlock";
import { ExternalLink } from "./ExternalLink";
import { FixedImage } from "./FixedImage";
import { LazyVisibleChunk } from "./LazyVisibleChunk";
import { LiveRegion } from "./LiveRegion";
import { PlaceholderAsset } from "./PlaceholderAsset";
import { SectionShell, type SectionLoader } from "./SectionShell";
import { SkipLink } from "./SkipLink";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SectionShell", () => {
  it("prerenders the anchor, labelled section, focusable h2 and hidden seam while the body is lazy", () => {
    const load: SectionLoader = () => new Promise(() => {});
    const html = renderToString(<SectionShell id="story" load={load} />);
    const host = document.createElement("div");
    host.innerHTML = html;
    const section = host.querySelector("section#story");
    expect(section?.getAttribute("aria-labelledby")).toBe("story-heading");
    const heading = host.querySelector("h2#story-heading");
    expect(heading?.textContent).toBe(site.sections.story.heading);
    expect(heading?.getAttribute("tabindex")).toBe("-1");
    expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(host.querySelector("[data-ticker-seam]")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the Intro heading as the h1 and labels the Hook by its headline", () => {
    render(
      <>
        <SectionShell id="hook">
          <p id="hook-headline">Headline</p>
        </SectionShell>
        <SectionShell id="intro">
          <p>Body</p>
        </SectionShell>
      </>,
    );
    expect(screen.getByRole("region", { name: "Headline" })).toHaveAttribute("id", "hook");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(site.sections.intro.heading);
  });

  it("shows the load error with Retry, keeps the heading, and loads on retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const load = vi.fn<SectionLoader>((attempt) =>
      attempt === 0
        ? Promise.reject(new Error("chunk failed"))
        : Promise.resolve({ default: () => <p>Story body</p> }),
    );
    render(<SectionShell id="story" load={load} eager />);
    expect(await screen.findByText(ui.sectionLoadError)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: site.sections.story.heading })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: ui.retry }));
    expect(await screen.findByText("Story body")).toBeInTheDocument();
    expect(load).toHaveBeenLastCalledWith(1);
  });
});

describe("PlaceholderAsset and FixedImage", () => {
  it("labels an image placeholder visibly and for assistive technologies", () => {
    render(<PlaceholderAsset variant="image" expected="hookBefore image" width={640} height={400} />);
    const img = screen.getByRole("img", { name: "Placeholder: hookBefore image" });
    expect(img).toHaveTextContent("Placeholder");
    expect(img).toHaveTextContent("hookBefore image");
    expect(img).toHaveStyle({ aspectRatio: "640 / 400" });
  });

  it("renders a Placeholder slot as a PlaceholderAsset in the declared box", () => {
    render(<FixedImage image={{ placeholder: true, expected: "AWS logo", width: 96, height: 96 }} />);
    expect(screen.getByRole("img", { name: "Placeholder: AWS logo" })).toHaveStyle({ width: "96px" });
  });

  it("falls back to alt text and 'Image unavailable' in the same box when the file cannot be loaded", () => {
    render(<FixedImage image={{ src: "missing/file.webp", width: 800, height: 450, alt: "Stage 1 chart" }} />);
    const box = screen.getByText("Stage 1 chart").parentElement;
    expect(box).toHaveTextContent(ui.imageUnavailable);
    expect(box).toHaveStyle({ aspectRatio: "800 / 450", width: "800px" });
  });
});

describe("links, live region, code block and lazy chunk", () => {
  it("ExternalLink opens a new tab safely and says so in its name", () => {
    render(<ExternalLink href="https://example.com">Example</ExternalLink>);
    const link = screen.getByRole("link", { name: `Example ${ui.opensInNewTab}` });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("SkipLink targets main and moves focus there", async () => {
    render(
      <>
        <SkipLink />
        <main id="main" tabIndex={-1} />
      </>,
    );
    await userEvent.click(screen.getByRole("link", { name: ui.skipLink }));
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("LiveRegion exposes only the current message", () => {
    const { rerender } = render(<LiveRegion message="first" messageKey={1} />);
    rerender(<LiveRegion message="second" messageKey={2} />);
    expect(screen.getByRole("status")).toHaveTextContent(/^second$/);
  });

  it("CodeBlock is a named, keyboard-focusable scroll region", () => {
    render(<CodeBlock code="SELECT 1;" label="Prompt example" />);
    expect(screen.getByRole("region", { name: "Prompt example" })).toHaveAttribute("tabindex", "0");
  });

  it("LazyVisibleChunk shows the error view and retries", async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue("loaded value");
    render(
      <LazyVisibleChunk
        load={load}
        trigger
        fallback={<p>waiting</p>}
        error={(retry) => (
          <button type="button" onClick={retry}>
            again
          </button>
        )}
      >
        {(value) => <p>{value}</p>}
      </LazyVisibleChunk>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "again" }));
    await waitFor(() => expect(screen.getByText("loaded value")).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(2);
  });
});
