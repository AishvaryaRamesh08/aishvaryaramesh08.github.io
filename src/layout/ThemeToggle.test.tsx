// Unit tests for the Theme toggle (Req 5.2, 5.3, 5.4, 5.5). The pre-paint script is covered in
// src/lib/theme.inlineScript.test.tsx; the resolution rule by Property 34 (task 5.3).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../hooks/ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

const app = (
  <ThemeProvider>
    <ThemeToggle />
  </ThemeProvider>
);

afterEach(() => {
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  localStorage.clear();
});

describe("ThemeToggle", () => {
  it("prerenders the first-visit label", () => {
    expect(renderToString(app)).toContain('aria-label="Switch to light theme"');
  });

  it("switches the <html> class, persists the choice and renames itself", async () => {
    document.documentElement.classList.add("dark", "js");
    render(app);
    const button = screen.getByRole("button", { name: "Switch to light theme" });

    await userEvent.click(button);
    const root = document.documentElement;
    expect(root).toHaveClass("light");
    expect(root).not.toHaveClass("dark");
    expect(root.style.colorScheme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(button).toHaveAccessibleName("Switch to dark theme");

    await userEvent.click(button);
    expect(root).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(button).toHaveAccessibleName("Switch to light theme");
  });
});

describe("ThemeToggle switching (Req 5.2, 5.5)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Fresh Theme store per test (it keeps module-level state). */
  async function renderFresh(children?: ReactNode) {
    const { ThemeProvider: FreshProvider } = await import("../hooks/ThemeProvider");
    const { ThemeToggle: FreshToggle } = await import("./ThemeToggle");
    render(
      <FreshProvider>
        {children}
        <FreshToggle />
      </FreshProvider>,
    );
    return screen.getByRole("button", { name: /^Switch to (light|dark) theme$/ });
  }

  it("preserves typed form input (same element, same value) across a switch", async () => {
    document.documentElement.classList.add("dark", "js");
    const button = await renderFresh(
      <form aria-label="Contact">
        <label>
          Message
          <textarea name="message" />
        </label>
      </form>,
    );
    const field = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(field, "Hello, data team");

    await userEvent.click(button);
    expect(document.documentElement).toHaveClass("light");
    // Same node, same value: only the <html> class changed.
    expect(screen.getByRole("textbox", { name: "Message" })).toBe(field);
    expect(field).toHaveValue("Hello, data team");

    await userEvent.click(button);
    expect(document.documentElement).toHaveClass("dark");
    expect(field).toHaveValue("Hello, data team");
  });

  it("keeps working for the session, without an error, when storage writes throw", async () => {
    document.documentElement.classList.add("dark", "js");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const button = await renderFresh();

    await userEvent.click(button);
    expect(document.documentElement).toHaveClass("light");
    expect(button).toHaveAccessibleName("Switch to dark theme");
    await userEvent.click(button);
    expect(document.documentElement).toHaveClass("dark");
    expect(button).toHaveAccessibleName("Switch to light theme");
  });
});
