// Light example tests for the Terminal_Widget (Req 24). The full suite is task 16.7 and the
// command/history logic is property-tested in `lib/terminal`; these cover the non-obvious DOM
// contracts: Enter submits and prints command + response, the polite live region carries only the
// newest response, blank input adds nothing and keeps focus, and `clear` empties the log and keeps
// focus (Req 24.1, 24.6, 24.8, 24.10).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { intro } from "../../data/intro";
import { terminal } from "../../data/terminal";
import { TerminalWidget } from "./TerminalWidget";

function getInput() {
  return screen.getByRole("textbox", { name: terminal.inputLabel });
}

describe("TerminalWidget", () => {
  it("submits on Enter and prints the command after the prompt with its response", async () => {
    const user = userEvent.setup();
    render(<TerminalWidget />);

    await user.type(getInput(), "whoami{enter}");

    const log = screen.getByRole("log");
    expect(within(log).getByText("whoami")).toBeInTheDocument();
    // The prompt symbol precedes the submitted command.
    expect(within(log).getAllByText(terminal.prompt).length).toBeGreaterThan(0);
    // The input is cleared after submit, focus stays in it.
    expect(getInput()).toHaveValue("");
    expect(getInput()).toHaveFocus();
  });

  it("announces only the newest response in the polite live region", async () => {
    const user = userEvent.setup();
    const { container } = render(<TerminalWidget />);

    await user.type(getInput(), "whoami{enter}");
    await user.type(getInput(), "help{enter}");

    const live = container.querySelector('[aria-live="polite"]') as HTMLElement;
    // The live region holds the latest (help) response, not the earlier whoami response.
    expect(live.textContent).toContain(`whoami - ${terminal.help.whoami}`); // the newest (help) response
    expect(live.textContent).not.toContain(intro.titleLine); // the earlier whoami role is not re-announced
    // But the <ol> still retains every prior entry.
    const log = screen.getByRole("log");
    expect(within(log).getAllByText("whoami").length).toBeGreaterThan(0);
  });

  it("ignores blank input: adds no entry and keeps focus in the input", async () => {
    const user = userEvent.setup();
    render(<TerminalWidget />);

    await user.type(getInput(), "   {enter}");

    const log = screen.getByRole("log");
    expect(log.querySelectorAll("li")).toHaveLength(0);
    expect(getInput()).toHaveValue("");
    expect(getInput()).toHaveFocus();
  });

  it("clears the history and keeps focus on `clear`", async () => {
    const user = userEvent.setup();
    render(<TerminalWidget />);

    await user.type(getInput(), "whoami{enter}");
    expect(screen.getByRole("log").querySelectorAll("li").length).toBeGreaterThan(0);

    await user.type(getInput(), "clear{enter}");
    expect(screen.getByRole("log").querySelectorAll("li")).toHaveLength(0);
    expect(getInput()).toHaveValue("");
    expect(getInput()).toHaveFocus();
  });

  it("recalls previous commands with ArrowUp/ArrowDown", async () => {
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
});
