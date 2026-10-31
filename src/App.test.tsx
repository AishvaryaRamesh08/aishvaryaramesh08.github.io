import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import App from "./App";
import { site } from "./data/site";
import { rawToReady } from "./data/rawToReady";
import { ui } from "./data/ui";
import { render as prerender } from "./entry-server";
import { SECTION_ANCHOR_IDS } from "./hooks/useHashScroll";
import { preloadSectionsUpTo, SECTION_IDS, SECTIONS } from "./sections";

/** Page order: Navigation, Hero, raw-to-ready band, … Contact, Footer. */
const EXPECTED_IDS = [
  "site-nav",
  "home",
  "raw-to-ready",
  "work",
  "skills",
  "journey",
  "contact",
  "site-footer",
];

/** The prerendered markup (what `dist/index.html` ships), parsed into a detached container. */
function prerendered(): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = prerender();
  return container;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

describe("app shell in the prerendered HTML", () => {
  it("has exactly one header, nav, main and footer, with nav in header and footer outside main", () => {
    const root = prerendered();
    for (const tag of ["header", "nav", "main", "footer"]) {
      expect(root.querySelectorAll(tag), tag).toHaveLength(1);
    }
    const nav = root.querySelector("nav")!;
    expect(nav.closest("header")).not.toBeNull();
    expect(nav).toHaveAttribute("aria-label", ui.primaryNav);
    expect(root.querySelector("footer")!.closest("main")).toBeNull();
    const main = root.querySelector("main")!;
    expect(main).toHaveAttribute("id", "main");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("renders all anchor IDs, unique and lowercase, in page order", () => {
    const root = prerendered();
    const ids = [...root.querySelectorAll<HTMLElement>("[id]")]
      .map((el) => el.id)
      .filter((id) => EXPECTED_IDS.includes(id));
    expect(ids).toEqual(EXPECTED_IDS);
    for (const id of EXPECTED_IDS) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
      expect(root.querySelectorAll(`[id="${id}"]`), id).toHaveLength(1);
    }
  });

  it("renders only the retained sections inside main, each labelled by its visible heading", () => {
    const root = prerendered();
    const main = root.querySelector("main")!;
    const sections = [...main.querySelectorAll("section")];
    expect(sections.map((s) => s.id)).toEqual(EXPECTED_IDS.slice(1, -1));
    for (const section of sections) {
      const labelId = section.getAttribute("aria-labelledby");
      const label = labelId ? root.querySelector(`[id="${labelId}"]`) : null;
      expect(label, section.id).not.toBeNull();
      expect(section.contains(label)).toBe(true);
      const text = label!.textContent?.trim() ?? "";
      expect(text.length, section.id).toBeGreaterThan(0);
      const expectedHeading =
        section.id === "raw-to-ready"
          ? rawToReady.title
          : site.sections[section.id as keyof typeof site.sections].heading;
      expect(text).toBe(expectedHeading);
    }
  });

  it("has exactly one h1, the Owner's name, and h2 for every other section heading", () => {
    const root = prerendered();
    const h1s = root.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(site.ownerName);
    expect(root.querySelectorAll("main > section h2")).toHaveLength(EXPECTED_IDS.length - 3);
    expect(root.querySelector("#hook")).toBeNull();
    expect(root.querySelector("#hook-headline")).toBeNull();
    expect(root.querySelector("#terminal")).toBeNull();
    expect(root.querySelector("#built-with-ai")).toBeNull();
    expect(root.querySelector("#analysis")).toBeNull();
    expect(root.querySelector("#visualization")).toBeNull();
  });

  it("makes the Skip link the first focusable element, targeting #main", () => {
    const root = prerendered();
    const first = root.querySelector(FOCUSABLE);
    expect(first?.tagName).toBe("A");
    expect(first).toHaveAttribute("href", "#main");
    expect(first).toHaveTextContent(ui.skipLink);
  });
});

describe("app shell behaviour", () => {
  it("moves focus to main when the Skip link is activated", async () => {
    const user = userEvent.setup();
    rtlRender(<App />);
    await user.click(screen.getByRole("link", { name: ui.skipLink }));
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("registers the Hero eagerly and every later section as a lazy chunk", () => {
    expect(SECTION_IDS).toEqual(SECTION_ANCHOR_IDS);
    expect(SECTIONS.filter((s) => s.kind === "eager").map((s) => s.id)).toEqual(["home"]);
  });

  it("preloads the lazy chunks up to a target section", async () => {
    const results = (await preloadSectionsUpTo("work")) as PromiseSettledResult<unknown>[];
    expect(results).toHaveLength(2); // home (no loader), work
    const loaded = results.filter((r) => r.status === "fulfilled" && r.value !== undefined);
    expect(loaded).toHaveLength(1);
  });

  it("configures fast-check to run at least 100 iterations per property", () => {
    expect(fc.readConfigureGlobal().numRuns).toBe(100);
  });
});
