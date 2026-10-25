// Light example tests for the Footer (Req 22). The full suite is task 19.7; these cover the
// non-obvious contracts: the single block of content, the social link names and new-tab targets,
// and the back-to-top button routing through scrollToSection then focusing the Skip link.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkipLink } from "../components/SkipLink";
import { contact } from "../data/contact";
import { site } from "../data/site";
import { Footer } from "./Footer";

const scrollToSection = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock("../lib/scrollToSection", () => ({ scrollToSection }));

afterEach(() => {
  scrollToSection.mockClear();
});

describe("Footer", () => {
  it("renders the colophon, owner copyright and built-with line in one footer landmark", () => {
    render(<Footer />);
    const footer = document.getElementById("site-footer");
    expect(footer).not.toBeNull();
    expect(screen.getByText(site.footer.builtWith)).toBeInTheDocument();
    expect(site.footer.builtWith).toBe("Built with Kiro, Claude and Copilot");
    expect(
      screen.getByText((_, el) => el?.textContent === `© ${new Date().getFullYear()} ${site.ownerName}`),
    ).toBeInTheDocument();
  });

  it("renders LinkedIn and GitHub as new-tab links named by destination, from contact.links", () => {
    render(<Footer />);
    const linkedin = screen.getByRole("link", { name: new RegExp(site.footer.linkedinName, "i") });
    const github = screen.getByRole("link", { name: new RegExp(site.footer.githubName, "i") });
    expect(linkedin).toHaveAttribute("href", contact.links.linkedin);
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(github).toHaveAttribute("href", contact.links.github);
    expect(github).toHaveAttribute("target", "_blank");
    // Email link present, routed to the mailto, and not a new tab.
    const email = screen.getByRole("link", { name: /email/i });
    expect(email).toHaveAttribute("href", contact.links.email);
    expect(email).not.toHaveAttribute("target");
  });

  it("back-to-top scrolls to the hook then moves focus to the Skip link", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink />
        <Footer />
      </>,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(site.footer.backToTop, "i") }));
    expect(scrollToSection).toHaveBeenCalledWith("hook", { focus: false });
    await waitFor(() => {
      const skip = screen.getByRole("link", { name: /skip to content/i });
      expect(skip).toHaveFocus();
    });
  });
});
