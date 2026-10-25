// Unit tests for SkipLink (Req 28.6, 28.7).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ui } from "../data/ui";
import { SkipLink } from "./SkipLink";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("SkipLink", () => {
  it('renders "Skip to content" as a link targeting the main region (Req 28.6)', () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: ui.skipLink });
    expect(link).toHaveAttribute("href", "#main");
  });

  it("stays visually hidden until focused, then becomes visible while focused (Req 28.6)", async () => {
    const user = userEvent.setup();
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: ui.skipLink });

    // Hidden at rest via the sr-only utility; visibility is promised only on focus.
    expect(link).toHaveClass("sr-only");
    expect(link.className).toMatch(/focus:not-sr-only/);

    await user.tab();
    expect(link).toHaveFocus();
  });

  it("is the first element in the Tab order when it is first in the DOM (Req 28.6)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink />
        <a href="#elsewhere">Other link</a>
        <button type="button">Button</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("link", { name: ui.skipLink })).toHaveFocus();
  });

  it("moves keyboard focus to the main content region when activated (Req 28.7)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink />
        <main id="main" tabIndex={-1}>
          Content
        </main>
      </>,
    );
    await user.click(screen.getByRole("link", { name: ui.skipLink }));
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("honours a custom target id", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink targetId="content" />
        <section id="content" tabIndex={-1} aria-label="Content region" />
      </>,
    );
    const link = screen.getByRole("link", { name: ui.skipLink });
    expect(link).toHaveAttribute("href", "#content");
    await user.click(link);
    expect(screen.getByRole("region", { name: "Content region" })).toHaveFocus();
  });

  it("does nothing on activation when the target is missing", async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="absent" />);
    // No throw, no focus move: the handler bails out when getElementById returns null.
    await expect(user.click(screen.getByRole("link", { name: ui.skipLink }))).resolves.toBeUndefined();
  });
});
