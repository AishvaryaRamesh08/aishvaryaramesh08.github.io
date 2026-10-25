import { describe, expect, it } from "vitest";
import { injectAppHtml } from "./prerender.ts";

const template = `<!doctype html><html lang="en"><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>`;

describe("injectAppHtml", () => {
  it("places the app markup inside #root and leaves the rest of the document unchanged", () => {
    const out = injectAppHtml(template, `<main id="main"><p>Hi</p></main>`);
    expect(out).toBe(template.replace(`<div id="root"></div>`, `<div id="root"><main id="main"><p>Hi</p></main></div>`));
  });

  it("inserts '$' sequences in the markup literally", () => {
    const out = injectAppHtml(template, "<p>$& $1 $$</p>");
    expect(out).toContain(`<div id="root"><p>$& $1 $$</p></div>`);
  });

  it("throws when the template has no empty #root", () => {
    expect(() => injectAppHtml("<html><body></body></html>", "<p></p>")).toThrow(/found 0/);
  });

  it("throws when the template has more than one empty #root", () => {
    const doubled = template.replace("</body>", `<div id="root"></div></body>`);
    expect(() => injectAppHtml(doubled, "<p></p>")).toThrow(/found 2/);
  });
});
