import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { work } from "../../data/work";
import FeaturedWork from "./FeaturedWork";

afterEach(() => {
  vi.restoreAllMocks();
});

function cardButton(title: string): HTMLButtonElement {
  const buttons = screen.getAllByRole("button");
  const match = buttons.find((button) => button.textContent?.includes(title));
  if (!(match instanceof HTMLButtonElement)) throw new Error(`No featured work button for "${title}"`);
  return match;
}

describe("FeaturedWork", () => {
  it("renders four fixed featured cards and three compact More projects rows", () => {
    render(<FeaturedWork />);

    const list = screen.getAllByRole("list")[0];
    const cards = screen.getAllByRole("button").filter((button) =>
      work.featured.some((project) => button.textContent?.includes(project.title)),
    );
    expect(cards).toHaveLength(4);
    expect(list).not.toBeNull();
    expect(list?.children).toHaveLength(4);
    work.featured.forEach((project, index) => {
      expect(cards[index]).toHaveTextContent(project.title);
      expect(cards[index]).toHaveTextContent(work.dialog.viewDetails);
    });

    expect(screen.getByRole("heading", { name: work.dialog.moreProjects })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.queryByRole("heading", { name: /analysis/i })).toBeNull();
  });

  it("opens a labelled modal with the provided details without changing the card grid", async () => {
    const user = userEvent.setup();
    render(<FeaturedWork />);

    const cards = work.featured.map((project) => cardButton(project.title));
    const grid = cards[0].parentElement?.parentElement;
    await user.click(cards[0]);

    const dialog = screen.getByRole("dialog", { name: work.featured[0].title });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(screen.getByText(work.featured[0].challenge!));
    expect(dialog).toContainElement(screen.getByText(work.featured[0].approach));
    expect(dialog).toContainElement(screen.getByText(work.featured[0].outcome!));
    expect(within(dialog).getByRole("img", { name: /five-layer elt pipeline/i })).toBeInTheDocument();
    expect(cards[0].parentElement?.parentElement).toBe(grid);
    expect(grid?.children).toHaveLength(4);
  });

  it("omits empty modal sections and displays the progress badge", async () => {
    const user = userEvent.setup();
    render(<FeaturedWork />);

    const inProgress = work.featured[3];
    await user.click(cardButton(inProgress.title));
    const dialog = screen.getByRole("dialog", { name: inProgress.title });
    expect(within(dialog).queryByRole("heading", { name: "Challenge" })).toBeNull();
    expect(within(dialog).queryByRole("heading", { name: "Outcome" })).toBeNull();
    expect(within(dialog).getByText(inProgress.badge!)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Approach" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Tech" })).toBeInTheDocument();
  });

  it("traps focus, locks page scrolling, closes on Escape, and restores focus", async () => {
    const user = userEvent.setup();
    render(<FeaturedWork />);
    const card = cardButton(work.featured[0].title);
    await user.click(card);

    const dialog = screen.getByRole("dialog", { name: work.featured[0].title });
    const close = within(dialog).getByRole("button", { name: work.dialog.closeLabel });
    expect(close).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe("hidden");

    await user.tab({ shift: true });
    expect(within(dialog).getAllByRole("button").at(-1)).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.documentElement.style.overflow).toBe("");
    expect(card).toHaveFocus();
  });

  it("closes on a backdrop click and returns focus to the card", async () => {
    const user = userEvent.setup();
    render(<FeaturedWork />);
    const card = cardButton(work.featured[1].title);
    await user.click(card);

    fireEvent.pointerDown(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(card).toHaveFocus();
  });

  it("lets a focused or activated fictional job show downstream failure impact", async () => {
    const user = userEvent.setup();
    render(<FeaturedWork />);
    await user.click(cardButton(work.featured[1].title));
    const dialog = screen.getByRole("dialog", { name: work.featured[1].title });
    expect(within(dialog).getByText("Illustrative demo, fictional jobs")).toBeInTheDocument();

    const failed = within(dialog).getByRole("button", { name: /source_orders, failed/i });
    expect(within(dialog).getByRole("button", { name: /refresh_report, downstream impact/i })).toBeInTheDocument();
    const customers = within(dialog).getByRole("button", { name: /source_customers/i });
    act(() => customers.focus());
    expect(customers).toHaveAttribute("aria-label", expect.stringContaining("failed"));
    await user.keyboard("{Enter}");
    expect(within(dialog).getByRole("button", { name: /build_customer_dim, downstream impact/i })).toBeInTheDocument();
    expect(failed).toBeInTheDocument();
  });
});
