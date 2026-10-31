import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { intro } from "../../data/intro";
import { terminal } from "../../data/terminal";
import { withBase } from "../../lib/url";
import IntroScreen from "./IntroScreen";

const scrollToSection = vi.hoisted(() => vi.fn());
vi.mock("../../lib/scrollToSection", () => ({ scrollToSection }));

function renderInSection() {
  return render(
    <section id="home" aria-labelledby="home-heading">
      <IntroScreen />
    </section>,
  );
}

afterEach(() => {
  scrollToSection.mockClear();
});

describe("Hero", () => {
  it("renders the configured Hero copy, larger monogram avatar and non-interactive focus tags", () => {
    const { container } = renderInSection();

    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(intro.name);
    expect(screen.getByText(intro.availability)).toBeInTheDocument();
    expect(screen.getByText(intro.titleLine)).toBeInTheDocument();
    expect(screen.getByText(intro.paragraph)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: intro.photoAlt })).toHaveTextContent("AR");
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelector(".portrait-frame")).toBeNull();
    expect(container.textContent?.toLowerCase()).not.toContain("placeholder");
    expect(container.textContent).not.toContain("50+");
    for (const area of intro.focusAreas) expect(screen.getByText(area.label)).toBeInTheDocument();
    expect(container.querySelectorAll('a, button')).toHaveLength(3);
  });

  it("routes the hero CTAs to their sections in tab order", async () => {
    const user = userEvent.setup();
    const { container } = renderInSection();
    const controls = Array.from(container.querySelectorAll("a[href]"));
    expect(controls.map((link) => link.textContent?.trim())).toEqual([
      intro.ctas.work,
      intro.ctas.resume,
      intro.ctas.contact,
    ]);

    const availability = screen.getByText(intro.availability);
    expect(availability.tagName).toBe("P");
    expect(availability).not.toHaveAttribute("tabindex");

    await user.click(screen.getByRole("link", { name: intro.ctas.work }));
    expect(scrollToSection).toHaveBeenCalledWith("work");
    await user.click(screen.getByRole("link", { name: intro.ctas.contact }));
    expect(scrollToSection).toHaveBeenCalledWith("contact");
  });

  it("renders the resume CTA and configured compact stat row", () => {
    const { container } = renderInSection();
    const resume = screen.getByRole("link", { name: intro.ctas.resume });
    expect(resume).toHaveAttribute("href", withBase(intro.resumeUrl));
    expect(resume).toHaveAttribute("download");

    const cards = container.querySelector<HTMLUListElement>("ul.hero-reveal")!;
    const items = within(cards).getAllByRole("listitem");
    expect(items).toHaveLength(intro.chips.length);
    intro.chips.forEach((chip, index) => {
      expect(items[index]).toHaveTextContent(chip.finalText);
      expect(items[index]).toHaveTextContent(chip.label);
    });
  });

  it("embeds the in-flow terminal window without a large portrait", () => {
    const { container } = renderInSection();
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelector(".portrait-frame")).toBeNull();
    expect(screen.getByRole("textbox", { name: terminal.inputLabel })).toHaveAttribute(
      "aria-label",
      terminal.inputLabel,
    );
    expect(screen.getByRole("log", { name: "Interactive terminal" })).toBeInTheDocument();
  });
});
