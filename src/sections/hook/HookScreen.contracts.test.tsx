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

const BASE_URL = import.meta.env.BASE_URL;

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
  it("renders a labelled headline, raw-data preview, and chart without comparison labels", () => {
    const { container } = renderInSection();
    const headline = document.getElementById("hook-headline");

    expect(headline).toHaveTextContent(hook.headline.before);
    expect(headline).toHaveTextContent(hook.headline.after);
    expect(headline?.tagName).toBe("P");
    expect(screen.queryByText("Before · raw CSV · messy")).toBeNull();
    expect(screen.queryByText("After · Plotly · interactive")).toBeNull();
    expect(screen.queryByText(/more rows/i)).toBeNull();
    expect(screen.getByRole("region", { name: /raw csv/i })).toBeInTheDocument();
    expect(container.querySelector("[data-testid='hook-plotly-chart']")).toBeInTheDocument();
    expect(container.querySelector('[data-section-body="hook"]')?.className).toContain("min-h-[100svh]");
  });

  it("renders real links to the introduction and featured work", async () => {
    const user = userEvent.setup();
    renderInSection();

    const primary = screen.getByRole("link", { name: hook.primaryCta.label });
    const secondary = screen.getByRole("link", { name: hook.secondaryCta.label });
    expect(primary).toHaveAttribute("href", `${BASE_URL}#intro`);
    expect(secondary).toHaveAttribute("href", `${BASE_URL}#work`);

    await user.click(secondary);
    expect(scrollToSection).toHaveBeenCalledWith("work");
  });
});
