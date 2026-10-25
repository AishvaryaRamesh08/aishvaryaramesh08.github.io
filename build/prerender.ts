// Pure helpers for the build-time prerender step (design D1), used by scripts/prerender.ts.

/** The empty root container emitted by Vite from index.html. */
export const ROOT_PLACEHOLDER = /<div id="root"><\/div>/;

/**
 * Injects prerendered app markup into the built index.html.
 * Throws if the template has no empty `#root` container or has more than one, so a changed
 * index.html can never silently ship without prerendered content.
 */
export function injectAppHtml(template: string, appHtml: string): string {
  const matches = template.match(new RegExp(ROOT_PLACEHOLDER.source, "g")) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `prerender: expected exactly one empty <div id="root"></div> in index.html, found ${matches.length}`,
    );
  }
  // Function replacer so "$" sequences in the app markup are inserted literally.
  return template.replace(ROOT_PLACEHOLDER, () => `<div id="root">${appHtml}</div>`);
}
