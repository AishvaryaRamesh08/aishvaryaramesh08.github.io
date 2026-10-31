import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { intro } from "../../data/intro";
import { terminal } from "../../data/terminal";
import { defaultTerminalContext } from "../../lib/terminal";
import { withBase } from "../../lib/url";
import { TerminalWidget } from "./TerminalWidget";

function getInput() {
  return screen.getByRole("textbox", { name: terminal.inputLabel });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TerminalWidget", () => {
  it("renders a traditional shell with a static banner and an unfocused prompt", () => {
    render(<TerminalWidget />);
    const log = screen.getByRole("log", { name: "Interactive terminal" });
    expect(within(log).getByText(terminal.banner[0])).toBeInTheDocument();
    expect(within(log).getByText(terminal.banner[1])).toBeInTheDocument();
    expect(within(log).getByText(terminal.prompt, { selector: "span[aria-hidden]" })).toBeInTheDocument();
    expect(screen.getByText(terminal.windowLabel)).toBeInTheDocument();
    expect(getInput()).not.toHaveFocus();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
  });

  it("runs help in the shell without changing document scroll position", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 480 });
    render(<TerminalWidget />);
    await user.type(getInput(), "help{enter}");
    const log = screen.getByRole("log", { name: "Interactive terminal" });
    expect(within(log).getByText(`${terminal.prompt} help`)).toBeInTheDocument();
    expect(within(log).getByText(`whoami - ${terminal.help.whoami}`)).toBeInTheDocument();
    expect(getInput()).toHaveValue("");
    expect(getInput()).toHaveFocus();
    expect(window.scrollY).toBe(480);
  });

  it("focuses the input from anywhere in the terminal without scrolling the page", async () => {
    const user = userEvent.setup();
    const focus = vi.spyOn(HTMLInputElement.prototype, "focus");
    render(<TerminalWidget />);
    await user.click(screen.getByRole("log", { name: "Interactive terminal" }));
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(getInput()).toHaveFocus();
  });

  it("searches free text, ignores stop words and supports Texas A&M queries", async () => {
    const user = userEvent.setup();
    render(<TerminalWidget />);
    await user.type(getInput(), "what is BigQuery about?{enter}");
    const log = screen.getByRole("log", { name: "Interactive terminal" });
    expect(within(log).getByText("1. Cloud")).toBeInTheDocument();
    expect(within(log).getByText("2. Databases")).toBeInTheDocument();

    await user.type(getInput(), "texas a&m{enter}");
    expect(within(log).getByText(/^1\. Texas A&M University$/)).toBeInTheDocument();
  });

  it("prints configured no-results feedback for an unmatched query", async () => {
    const user = userEvent.setup();
    render(<TerminalWidget />);
    await user.type(getInput(), "qzxv-no-such-topic{enter}");
    expect(screen.getByText(terminal.noResults("qzxv-no-such-topic"))).toBeInTheDocument();
  });

  it("renders command links as real anchors and opens a configured resume", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<TerminalWidget />);
    await user.type(getInput(), "contact{enter}");
    const log = screen.getByRole("log", { name: "Interactive terminal" });
    expect(within(log).getByRole("link", { name: /LinkedIn:/ })).toHaveAttribute("href", defaultTerminalContext.links.linkedin);
    expect(within(log).getByRole("link", { name: /GitHub:/ })).toHaveAttribute("href", defaultTerminalContext.links.github);

    await user.type(getInput(), "resume{enter}");
    expect(within(log).getByRole("link", { name: withBase(intro.resumeUrl) })).toHaveAttribute("href", withBase(intro.resumeUrl));
    expect(open).toHaveBeenCalledWith(withBase(intro.resumeUrl), "_blank", "noopener,noreferrer");
  });

  it("supports ArrowUp and ArrowDown history recall", async () => {
    const user = userEvent.setup();
    render(<TerminalWidget />);
    await user.type(getInput(), "whoami{enter}");
    await user.type(getInput(), "help{enter}");
    await user.type(getInput(), "{ArrowUp}");
    expect(getInput()).toHaveValue("help");
    await user.type(getInput(), "{ArrowUp}");
    expect(getInput()).toHaveValue("whoami");
    await user.type(getInput(), "{ArrowDown}");
    expect(getInput()).toHaveValue("help");
    await user.type(getInput(), "{ArrowDown}");
    expect(getInput()).toHaveValue("");
  });

  it("autocompletes commands with Tab and leaves the terminal through normal tab order", async () => {
    const user = userEvent.setup();
    render(
      <>
        <TerminalWidget />
        <button type="button">After terminal</button>
      </>,
    );
    await user.type(getInput(), "ex{tab}");
    expect(getInput()).toHaveValue("experience");
    await user.keyboard("{tab}");
    expect(screen.getByRole("button", { name: "After terminal" })).toHaveFocus();
  });

  it("supports Ctrl+C, Ctrl+L and the clear command", async () => {
    const user = userEvent.setup();
    render(<TerminalWidget />);
    await user.type(getInput(), "not finished");
    await user.keyboard("{Control>}c{/Control}");
    let log = screen.getByRole("log", { name: "Interactive terminal" });
    expect(within(log).getByText(terminal.interruptOutput)).toBeInTheDocument();
    expect(within(log).getByText(`${terminal.prompt} not finished`)).toBeInTheDocument();

    await user.type(getInput(), "help{enter}");
    await user.keyboard("{Control>}l{/Control}");
    log = screen.getByRole("log", { name: "Interactive terminal" });
    expect(within(log).queryByText(`${terminal.prompt} help`)).not.toBeInTheDocument();
    expect(within(log).getByText(terminal.banner[0])).toBeInTheDocument();

    await user.type(getInput(), "help{enter}");
    await user.type(getInput(), "clear{enter}");
    expect(within(log).queryByText(`${terminal.prompt} help`)).not.toBeInTheDocument();
    expect(within(log).getByText(terminal.banner[0])).toBeInTheDocument();
  });

  it("prints the configured unavailable message when the resume URL is empty", async () => {
    const user = userEvent.setup();
    render(<TerminalWidget context={{ ...defaultTerminalContext, resumeUrl: "" }} />);
    await user.type(getInput(), "resume{enter}");
    expect(screen.getByText(terminal.resumeUnavailable)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /resume\.pdf/ })).not.toBeInTheDocument();
  });
});
