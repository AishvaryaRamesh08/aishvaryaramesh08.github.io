// DOM focus helpers shared by the focus trap (design: Hooks, Req 28.4). Client-only: call them
// from effects or event handlers, never during render.

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
].join(",");

/**
 * Keyboard-reachable elements inside `container`, in DOM (Tab) order. Skips negative
 * `tabindex`, and anything inside a `hidden` or `inert` subtree.
 */
export function getFocusableElements(container: Element): HTMLElement[] {
  const candidates = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(candidates).filter(
    (element) => element.tabIndex >= 0 && !element.closest("[hidden], [inert]"),
  );
}

const NEVER_INERT = new Set(["SCRIPT", "STYLE", "LINK", "TEMPLATE", "NOSCRIPT"]);

/**
 * Every element outside `container` that has to be inert for `container` to behave as a modal:
 * the siblings of `container` and of each of its ancestors up to `<body>`. For a dialog portalled
 * into `<body>` this is the app root; for a menu inside the header it is the rest of the header
 * plus `main` and `footer`.
 */
export function getOutsideSiblings(container: Element): HTMLElement[] {
  const result: HTMLElement[] = [];
  let node: Element | null = container;
  while (node && node.parentElement && node !== document.body) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling !== node && sibling instanceof HTMLElement && !NEVER_INERT.has(sibling.tagName)) {
        result.push(sibling);
      }
    }
    node = node.parentElement;
  }
  return result;
}
