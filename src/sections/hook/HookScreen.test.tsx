// Light example tests for the Hook_Screen (Req 8). The full suite is task 8.2; these cover the
// non-obvious contracts: the headline labels the section without being a heading, the arrow is
// decorative, and the CTAs route through scrollToSection to the right sections.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hook } from "../../data/hook";
import HookScreen from "./HookScreen";
import { resetHeadlinePlayed } from "./HookHeadline";

const scrollToSection = vi.hoisted(() => vi.fn());
vi.mock("../../lib/scrollToSection", () => ({ scrollToSection }));
vi.mock("./HookPlotlyChart", () => ({
  HookPlotlyChart: () => <div data-testid="hook-plotly-chart" />,
}));

/** Renders the body inside a real labelled section so `aria-labelledby` can be resolved. */
function renderInSection() {
  return render(
    <section id="hook" aria-labelledby="hook-headline">
      <HookScreen />
    </section>,
  );
}

afterEach(() => {
  scrollToSection.mockClear();
  resetHeadlinePlayed();
});

describe("HookScreen", () => {
  it("renders the headline as non-heading text that labels the section", () => {
    const { container } = renderInSection();

    expect(screen.queryByRole("heading")).toBeNull();

    const headline = document.getElementById("hook-headline");
    expect(headline).not.toBeNull();
    expect(headline?.tagName).toBe("P");
    expect(headline?.textContent).toContain(hook.headline.before);
    expect(headline?.textContent).toContain(hook.headline.after);

    const section = container.querySelector("section")!;
    expect(section.getAttribute("aria-labelledby")).toBe("hook-headline");
  });

  it("shows the raw data and chart without the small comparison labels", () => {
    renderInSection();

    expect(screen.queryByText("Before · raw CSV · messy")).not.toBeInTheDocument();
    expect(screen.queryByText("After · Plotly · interactive")).not.toBeInTheDocument();
    expect(screen.queryByText(/more rows/i)).not.toBeInTheDocument();
    expect(screen.getByText("Raw data")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /raw csv/i })).toBeInTheDocument();
    expect(screen.getByTestId("hook-plotly-chart")).toBeInTheDocument();
  });

  it("routes the CTAs to the introduction and featured work", async () => {
    const user = userEvent.setup();
    renderInSection();

    await user.click(screen.getByRole("link", { name: hook.primaryCta.label }));
    expect(scrollToSection).toHaveBeenCalledWith("intro");

    await user.click(screen.getByRole("link", { name: hook.secondaryCta.label }));
    expect(scrollToSection).toHaveBeenCalledWith("work");
  });
});
