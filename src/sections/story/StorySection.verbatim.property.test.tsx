import { cleanup, render } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoryConfig } from "../../data/types";

const storyRef: { current: StoryConfig } = { current: { quote: [] } };
vi.mock("../../data/story", () => ({
  get story() {
    return storyRef.current;
  },
}));

afterEach(() => {
  cleanup();
});

const paragraphText = fc.string({ minLength: 1, maxLength: 40 }).filter((text) => text.trim().length > 0);
const quoteArbitrary = fc.array(paragraphText, { minLength: 1, maxLength: 5 });

describe("StorySection quote rendering", () => {
  it("renders every generated paragraph verbatim and in order", async () => {
    await fc.assert(
      fc.asyncProperty(quoteArbitrary, async (quote) => {
        storyRef.current = { quote };
        vi.resetModules();
        const { default: StorySection } = await import("./StorySection");
        const { container, unmount } = render(<StorySection />);
        try {
          const paragraphs = Array.from(container.querySelectorAll("p"));
          expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual(quote);
        } finally {
          unmount();
        }
      }),
    );
  });
});
