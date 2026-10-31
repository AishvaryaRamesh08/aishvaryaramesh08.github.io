// Navbar and Mobile_Menu behaviour (Req 7.2, 7.5, 7.8, 7.9, 7.10, 7.12, 7.13).
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { site } from "../data/site";
import { ui } from "../data/ui";
import { ThemeProvider } from "../hooks/ThemeProvider";
import { Header } from "./Header";

/** Reduced motion, so scrollToSection jumps with one `window.scrollTo` and no GSAP tween. */
function stubReducedMotion(): void {
  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

function Page() {
  return (
    <ThemeProvider>
      <Header />
      <main id="main">
        <section id="home" aria-labelledby="home-heading">
          <h1 id="home-heading">Home</h1>
        </section>
        {site.navGroups.map((group) => (
          <section key={group.id} id={group.sections[0]} aria-labelledby={`${group.sections[0]}-heading`}>
            <h2 id={`${group.sections[0]}-heading`}>{group.label}</h2>
          </section>
        ))}
      </main>
    </ThemeProvider>
  );
}

let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stubReducedMotion();
  scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Navbar", () => {
  it("renders the logo, navigation links targeting each group's first section, and the menu button", () => {
    render(<Page />);
    const nav = screen.getByRole("navigation", { name: ui.primaryNav });
    expect(within(nav).getByRole("link", { name: site.ownerName }).querySelector("svg")).not.toBeNull();
    const links = within(nav)
      .getAllByRole("link")
      .filter((link) => link.textContent !== site.ownerName);
    expect(links.map((link) => link.textContent)).toEqual(site.navGroups.map((g) => g.label));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      site.navGroups.map((g) => `${import.meta.env.BASE_URL}#${g.sections[0]}`),
    );
    expect(screen.getByRole("button", { name: ui.openMenu })).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector("[data-scroll-progress]")).toHaveStyle({ transform: "scaleX(0)" });
  });

  it("scrolls to the target and focuses its heading when a link is activated", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("link", { name: "Work" }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Work" })).toHaveFocus();
  });

  it("keeps an opaque, blurred surface nav while tracking whether Home is visible", () => {
    let callback: IntersectionObserverCallback = () => {};
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
          callback = cb;
          expect(options?.rootMargin).toBe("-64px 0px 0px 0px");
        }
        observe = observe;
        disconnect = vi.fn();
      },
    );
    render(<Page />);
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("bg-surface/85", "backdrop-blur-[var(--glass-blur)]", "border-b", "border-border");
    expect(observe).toHaveBeenCalledWith(document.getElementById("home"));
    expect(header).toHaveAttribute("data-solid", "false");
    act(() => callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(header).toHaveAttribute("data-solid", "true");
    expect(header).toHaveClass("bg-surface/85");
    act(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(header).toHaveAttribute("data-solid", "false");
    expect(header).toHaveClass("bg-surface/85");
  });
});

describe("Mobile_Menu", () => {
  it("opens as a modal with focus on the first link, traps Tab, locks scroll, and Escape returns focus", async () => {
    const user = userEvent.setup();
    render(<Page />);
    const button = screen.getByRole("button", { name: ui.openMenu });
    await user.click(button);

    const dialog = screen.getByRole("dialog", { name: ui.menuDialog });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(button).toHaveAttribute("aria-expanded", "true");
    const links = within(dialog).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(site.navGroups.map((g) => g.label));
    expect(links[0]).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.getElementById("main")!.closest("[inert]")).not.toBeNull();

    // Shift+Tab from the close button (first control) wraps to the last link.
    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: ui.closeMenu })).toHaveFocus();
    await user.tab({ shift: true });
    expect(links[links.length - 1]).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole("button", { name: ui.closeMenu })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("closes from the close control and returns focus to the menu button", async () => {
    const user = userEvent.setup();
    render(<Page />);
    const button = screen.getByRole("button", { name: ui.openMenu });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: ui.closeMenu }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("closes on link activation, then scrolls to the target and focuses its heading", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: ui.openMenu }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("link", { name: "Contact" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: ui.openMenu })).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Contact" })).toHaveFocus());
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});

// --- Gap coverage for task 6.10: active-link reflection, scroll-progress and modified clicks ---

/** Stacks the Page's sections in document order with the given heights; rects follow `scrollY`. */
function layoutSectionsForScroll(heights: Record<string, number>): number {
  let top = 0;
  for (const id of Object.keys(heights)) {
    const element = document.getElementById(id);
    if (!element) continue;
    const docTop = top;
    const height = heights[id];
    vi.spyOn(element, "getBoundingClientRect").mockImplementation(
      () => ({ top: docTop - window.scrollY, bottom: docTop + height - window.scrollY }) as DOMRect,
    );
    top += height;
  }
  return top;
}

function scrollWindowTo(y: number): void {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  window.dispatchEvent(new Event("scroll"));
}

describe("Navbar active link (Req 7.11)", () => {
  afterEach(() => {
    scrollWindowTo(0);
  });

  it("reflects the active Nav_Group as aria-current on exactly one rendered desktop link while scrolling", async () => {
    render(<Page />);
    const nav = screen.getByRole("navigation", { name: ui.primaryNav });
    const half = window.innerHeight / 2;

    // Home is first, then one section per Nav_Group, in page order.
    layoutSectionsForScroll({
      home: 1000, // About group
      work: 1000, // Work group
      skills: 1000, // Skills group
      journey: 1000,
      contact: 1000,
    });

    await waitFor(() => expect(nav.querySelector('a[aria-current="true"]')).toHaveTextContent("About"));

    // Midpoint inside the Work section → the Work link is current and nothing else is.
    act(() => scrollWindowTo(1000 + half));
    await waitFor(() => {
      const current = nav.querySelectorAll('a[aria-current="true"]');
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveTextContent("Work");
    });

    // Midpoint inside the Skills section → the current link moves to Skills.
    act(() => scrollWindowTo(2000 + half));
    await waitFor(() => {
      const current = nav.querySelectorAll('a[aria-current="true"]');
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveTextContent("Skills");
    });
  });
});

describe("Navbar scroll-progress bar (Req 7.5)", () => {
  afterEach(() => {
    scrollWindowTo(0);
  });

  it("updates the bar's scaleX from the scroll offset over (page height − viewport)", async () => {
    // A 3000 px document in an 800 px viewport: 2200 px of scrollable range.
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 3000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    render(<Page />);
    const bar = document.querySelector("[data-scroll-progress]")!;

    act(() => scrollWindowTo(1100)); // halfway through the 2200 px range
    await waitFor(() => expect(bar).toHaveStyle({ transform: "scaleX(0.5)" }));

    act(() => scrollWindowTo(2200)); // bottom of the page
    await waitFor(() => expect(bar).toHaveStyle({ transform: "scaleX(1)" }));

    act(() => scrollWindowTo(4000)); // past the bottom clamps to 1
    await waitFor(() => expect(bar).toHaveStyle({ transform: "scaleX(1)" }));
  });
});

describe("Navbar link clicks (Req 7.2)", () => {
  it("does not intercept a modified click, leaving the browser to open the link normally", async () => {
    const user = userEvent.setup();
    render(<Page />);
    const link = screen.getByRole("link", { name: "Work" });
    // A Ctrl/Cmd+click (open in a new tab) must keep the default behaviour: no programmatic scroll.
    await user.keyboard("[ControlLeft>]");
    await user.click(link);
    await user.keyboard("[/ControlLeft]");
    expect(scrollTo).not.toHaveBeenCalled();
    // The link keeps a real same-origin href so the new tab lands on the fragment.
    expect(link).toHaveAttribute("href", `${import.meta.env.BASE_URL}#work`);
  });
});
