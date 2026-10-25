// Property 47: Placeholder labeling (task 5.7).
// **Validates: Requirements 4.5, 28.8**
//
// For any expected-asset name, `PlaceholderAsset` renders visible text containing "Placeholder"
// and that name, and an image placeholder's accessible name includes the name. `FixedImage`
// renders the same labelled placeholder for `Placeholder` inputs, in the declared box.
import { cleanup, render, screen } from "@testing-library/react";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ui } from "../data/ui";
import { FixedImage } from "./FixedImage";
import { PlaceholderAsset, placeholderLabel, type PlaceholderVariant } from "./PlaceholderAsset";

/**
 * Expected-asset names: whitespace-trimmed, non-empty, unicode allowed. Words contain no
 * whitespace and are joined by single spaces, so the accessible-name whitespace normalisation
 * leaves the name unchanged and it can be compared exactly.
 */
const word = fc
  .oneof(
    fc.string({ unit: "grapheme", minLength: 1, maxLength: 8 }),
    fc.string({ unit: "grapheme-ascii", minLength: 1, maxLength: 12 }),
  )
  .map((s) => s.replace(/\s+/gu, ""))
  .filter((s) => s.length > 0);
const expectedName = fc.array(word, { minLength: 1, maxLength: 4 }).map((ws) => ws.join(" "));

const variant = fc.constantFrom<PlaceholderVariant>("image", "text", "link", "button");
const dimension = fc.integer({ min: 1, max: 4000 });
const dims = fc.option(fc.record({ width: dimension, height: dimension }), { nil: undefined });

/** The visible label: the placeholder root is not hidden from sighted users or assistive tech. */
function expectVisiblyLabelled(root: HTMLElement, expected: string) {
  expect(root).toBeVisible();
  expect(root.closest("[aria-hidden='true']")).toBeNull();
  const text = root.textContent ?? "";
  expect(text).toContain(ui.placeholder);
  expect(text).toContain(expected);
  // "Placeholder" is its own visible text node, not hidden inside the name.
  const label = Array.from(root.querySelectorAll("span")).find((s) => s.textContent === ui.placeholder);
  expect(label).toBeDefined();
}

/** Image placeholders: role="img" named "Placeholder: <expected>", keeping the declared box. */
function expectImagePlaceholder(expected: string, box?: { width: number; height: number }) {
  const img = screen.getByRole("img");
  expect(img).toHaveAttribute("aria-label", placeholderLabel(expected));
  expect(img).toHaveAccessibleName(`${ui.placeholder}: ${expected}`);
  expectVisiblyLabelled(img, expected);
  if (box) {
    expect(img.style.width).toBe(`${box.width}px`);
    expect(img.style.maxWidth).toBe("100%");
    expect(img.style.aspectRatio).toBe(`${box.width} / ${box.height}`);
  }
  return img;
}

describe("Property 47: Placeholder labeling", () => {
  it("every PlaceholderAsset variant visibly shows 'Placeholder' and the expected name", () => {
    fc.assert(
      fc.property(expectedName, variant, dims, (expected, v, box) => {
        try {
          const { container } = render(
            <PlaceholderAsset expected={expected} variant={v} width={box?.width} height={box?.height} />,
          );
          const root = container.firstElementChild as HTMLElement;
          expect(root).not.toBeNull();
          expect(root).toHaveAttribute("data-placeholder", expected);

          if (v === "image") {
            expect(expectImagePlaceholder(expected, box)).toBe(root);
          } else {
            expectVisiblyLabelled(root, expected);
            expect(root.textContent).toBe(`${ui.placeholder}: ${expected}`);
            // Link/button/text placeholders are inert: no link target, no control, not focusable.
            expect(container.querySelector("a, button, [href], [tabindex], [role]")).toBeNull();
            expect(screen.queryByRole("link")).toBeNull();
            expect(screen.queryByRole("button")).toBeNull();
          }
        } finally {
          cleanup();
        }
      }),
    );
  });

  it("the default variant is a plain-text placeholder", () => {
    fc.assert(
      fc.property(expectedName, (expected) => {
        try {
          const { container } = render(<PlaceholderAsset expected={expected} />);
          const root = container.firstElementChild as HTMLElement;
          expectVisiblyLabelled(root, expected);
          expect(screen.queryByRole("img")).toBeNull();
        } finally {
          cleanup();
        }
      }),
    );
  });

  it("FixedImage renders a labelled image PlaceholderAsset for Placeholder inputs", () => {
    fc.assert(
      fc.property(expectedName, fc.record({ width: dimension, height: dimension }), (expected, box) => {
        try {
          const { container } = render(<FixedImage image={{ placeholder: true, expected, ...box }} />);
          expect(container.querySelector("img")).toBeNull();
          expectImagePlaceholder(expected, box);
        } finally {
          cleanup();
        }
      }),
    );
  });
});
