// Example tests for Lightbox and the modal hooks it composes (task 5.10).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ui } from "../data/ui";
import { useOutsideTap } from "../hooks/useDismiss";
import { Lightbox } from "./Lightbox";

function Gallery() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <header>
        <a href="#top">Logo</a>
      </header>
      <main>
        <button ref={openerRef} type="button" onClick={() => setOpen(true)}>
          Open ERD
        </button>
        <Lightbox
          open={open}
          onClose={() => setOpen(false)}
          caption="Entity relationship diagram"
          intrinsic={{ width: 800, height: 400 }}
          returnFocusTo={openerRef}
        >
          <a href="#erd-source">Source</a>
        </Lightbox>
      </main>
      <footer>Footer</footer>
    </>
  );
}

describe("Lightbox", () => {
  it("renders nothing on the server or while closed", () => {
    expect(renderToString(<Gallery />)).not.toContain("dialog");
    render(<Gallery />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a captioned modal dialog that locks the page and makes the background inert", async () => {
    const user = userEvent.setup();
    const { container } = render(<Gallery />);
    await user.click(screen.getByRole("button", { name: "Open ERD" }));

    const dialog = screen.getByRole("dialog", { name: "Entity relationship diagram" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Entity relationship diagram").tagName).toBe("FIGCAPTION");
    expect(screen.getByRole("button", { name: ui.close })).toHaveFocus();
    expect(container).toHaveAttribute("inert");
    expect(document.documentElement.style.overflow).toBe("hidden");

    // jsdom viewport 1024 × 768: padding 51.2 / 64, caption height 0, gap 12 → width-limited.
    const box = dialog.querySelector<HTMLElement>("[data-lightbox-content]");
    expect(box?.style.width).toBe("921.6px");
    expect(box?.style.height).toBe("460.8px");
  });

  it("cycles Tab and Shift+Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Gallery />);
    await user.click(screen.getByRole("button", { name: "Open ERD" }));
    const close = screen.getByRole("button", { name: ui.close });
    const source = screen.getByRole("link", { name: "Source" });

    await user.tab();
    expect(source).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(source).toHaveFocus();
  });

  it.each([
    ["Escape", (user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}")],
    ["the close button", (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: ui.close }))],
  ])("closes on %s, restores the background and returns focus to the opener", async (_, close) => {
    const user = userEvent.setup();
    const { container } = render(<Gallery />);
    const opener = screen.getByRole("button", { name: "Open ERD" });
    await user.click(opener);
    await close(user);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container).not.toHaveAttribute("inert");
    expect(document.documentElement.style.overflow).toBe("");
    expect(opener).toHaveFocus();
  });
});

function Tooltip({ onOutside }: { onOutside: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideTap(ref, onOutside, true);
  return (
    <>
      <div ref={ref}>Inside</div>
      <p>Outside</p>
    </>
  );
}

describe("useOutsideTap", () => {
  it("fires only for presses outside the referenced element", async () => {
    const user = userEvent.setup();
    const onOutside = vi.fn();
    render(<Tooltip onOutside={onOutside} />);
    await user.click(screen.getByText("Inside"));
    expect(onOutside).not.toHaveBeenCalled();
    await user.click(screen.getByText("Outside"));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });
});
