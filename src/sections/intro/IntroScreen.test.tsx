// Light example tests for the Intro_Screen (Req 9). The full suite is task 9.5; these cover the
// non-obvious contracts: the body renders no second heading (the single h1 is the shell's), the
// title line follows, the CTAs route to `work` / `contact`, the resume CTA is a non-linking
// placeholder when the PDF is absent, and reduced motion shows the three static lines plus the
// exact final chip values. `__RESUME_AVAILABLE__` is defined false by the Vitest config.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { intro } from "../../data/intro";
import { ui } from "../../data/ui";
import IntroScreen from "./IntroScreen";

const scrollToSection = vi.hoisted(() => vi.fn());
vi.mock("../../lib/scrollToSection", () => ({ scrollToSection }));

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

/** Renders the body inside a real labelled section carrying the single h1, as the shell does. */
function renderInSection() {
  return render(
    <section id="intro" aria-labelledby="intro-heading">
      <h1 id="intro-heading">{intro.name}</h1>
      <IntroScreen />
    </section>,
  );
}

beforeEach(() => {
  stubReducedMotion(false);
});

afterEach(() => {
  scrollToSection.mockClear();
  vi.unstubAllGlobals();
});

describe("IntroScreen", () => {
  it("renders no heading of its own and shows the title line under the h1", () => {
    renderInSection();

    // The only heading is the shell's h1; the body adds none (Req 9.1).
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe("H1");
    expect(headings[0]).toHaveTextContent(intro.name);

    expect(screen.getByText(intro.titleLine)).toBeInTheDocument();
  });

  it("routes the CTAs to the work and contact sections", async () => {
    const user = userEvent.setup();
    renderInSection();

    await user.click(screen.getByRole("link", { name: intro.ctas.explore }));
    expect(scrollToSection).toHaveBeenCalledWith("work");

    await user.click(screen.getByRole("link", { name: intro.ctas.talk }));
    expect(scrollToSection).toHaveBeenCalledWith("contact");
  });

  it("renders the resume CTA as a non-linking placeholder when the PDF is absent", () => {
    renderInSection();

    // No "Download resume" link exists; it is a labelled placeholder with no href (Req 9.10).
    expect(screen.queryByRole("link", { name: intro.ctas.resume })).toBeNull();
    const placeholder = document.querySelector('[data-placeholder="resume PDF"]');
    expect(placeholder).not.toBeNull();
    expect(placeholder?.querySelector("a")).toBeNull();
    expect(placeholder).toHaveTextContent(`${ui.placeholder}: resume PDF`);
  });

  it("under reduced motion shows the three static typewriter lines and the final chip values", () => {
    stubReducedMotion(true);
    renderInSection();

    for (const line of intro.typewriterLines) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    for (const chip of intro.chips) {
      // The exact final text is present (count-up never runs under reduced motion, Req 9.6).
      expect(screen.getAllByText(chip.finalText, { exact: false }).length).toBeGreaterThan(0);
    }
  });

  it("renders the three stat chips in content order, each with its label (Req 9.5)", () => {
    stubReducedMotion(true);
    const { container } = renderInSection();

    // Scope to the chips list (the Typewriter also renders a <ul> of lines under reduced motion):
    // find the <ul> whose items each carry a chip label, then assert order and labels.
    const chipList = Array.from(container.querySelectorAll("ul")).find((ul) =>
      intro.chips.every((chip) => ul.textContent?.includes(chip.label)),
    );
    expect(chipList).toBeDefined();

    const items = Array.from(chipList!.querySelectorAll(":scope > li"));
    expect(items).toHaveLength(intro.chips.length);
    intro.chips.forEach((chip, i) => {
      expect(items[i]).toHaveTextContent(chip.label);
      expect(items[i]).toHaveTextContent(chip.finalText);
    });
  });
});

// The resume CTA becomes a real download link only when the PDF is a real path AND present at build
// (`__RESUME_AVAILABLE__`). The Vitest config defines `__RESUME_AVAILABLE__` as false and the
// Content_Config ships a placeholder, so we test the "available" branch by stubbing the global and
// mocking the contact module to supply a real PDF path, re-importing IntroScreen fresh each time.
describe("IntroScreen resume CTA when the PDF is available", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock("../../data/contact");
  });

  it("renders a real download link to the Base_Path-resolved PDF", async () => {
    stubReducedMotion(false);
    vi.stubGlobal("__RESUME_AVAILABLE__", true);
    vi.resetModules();
    vi.doMock("../../data/contact", () => ({
      contact: {
        links: { resumePdf: "resume/aishvarya-ramesh-resume.pdf" },
      },
    }));

    const { default: FreshIntroScreen } = await import("./IntroScreen");
    const { withBase } = await import("../../lib/url");

    render(
      <section id="intro" aria-labelledby="intro-heading">
        <h1 id="intro-heading">{intro.name}</h1>
        <FreshIntroScreen />
      </section>,
    );

    // The CTA is now a link; it carries `download` and points at the PDF under the Base_Path (Req 9.9).
    const link = screen.getByRole("link", { name: intro.ctas.resume });
    expect(link).toHaveAttribute("download");
    expect(link).toHaveAttribute("href", withBase("resume/aishvarya-ramesh-resume.pdf"));

    // No placeholder stand-in remains for the resume.
    expect(document.querySelector('[data-placeholder="resume PDF"]')).toBeNull();
  });
});
