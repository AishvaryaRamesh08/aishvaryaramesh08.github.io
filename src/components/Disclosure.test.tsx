import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Disclosure, DisclosurePanel, useDisclosureGroup } from "./Disclosure";

const ids = ["source", "raw", "staging"] as const;

function Group() {
  const group = useDisclosureGroup<(typeof ids)[number]>();
  return (
    <div>
      {ids.map((id) => (
        <div key={id}>
          <Disclosure expanded={group.isExpanded(id)} controls={`${id}-panel`} onToggle={() => group.toggle(id)}>
            {id}
          </Disclosure>
          <DisclosurePanel id={`${id}-panel`} expanded={group.isExpanded(id)}>
            {id} details
          </DisclosurePanel>
        </div>
      ))}
    </div>
  );
}

describe("Disclosure", () => {
  it("prerenders collapsed buttons whose aria-controls resolve to hidden panels", () => {
    const host = document.createElement("div");
    host.innerHTML = renderToString(<Group />);
    const buttons = host.querySelectorAll("button");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.getAttribute("type")).toBe("button");
      expect(button.getAttribute("aria-expanded")).toBe("false");
      const panel = host.querySelector(`#${button.getAttribute("aria-controls")}`);
      expect(panel?.hasAttribute("hidden")).toBe(true);
    }
  });

  it("keeps at most one item expanded via click, Enter and Space, and keeps focus on collapse", async () => {
    const user = userEvent.setup();
    render(<Group />);
    const [source, raw] = [screen.getByRole("button", { name: "source" }), screen.getByRole("button", { name: "raw" })];

    await user.click(source);
    expect(source).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("source details")).toBeVisible();

    raw.focus();
    await user.keyboard("{Enter}");
    expect(raw).toHaveAttribute("aria-expanded", "true");
    expect(source).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("source details")).not.toBeVisible();

    await user.keyboard(" ");
    expect(raw).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("button").every((b) => b.getAttribute("aria-expanded") === "false")).toBe(true);
    expect(raw).toHaveFocus();
  });
});
