import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { story } from "../../data/story";
import StorySection from "./StorySection";

describe("StorySection", () => {
  it("renders the story copy verbatim and does not render sample records", () => {
    const { container } = render(<StorySection />);

    for (const paragraph of story.quote) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
    expect(screen.queryByRole("table")).toBeNull();
    expect(container).not.toHaveTextContent("Priya Shah");
    expect(container).not.toHaveTextContent("Sample customer records");
  });

  it("prerenders the quote without a customer-record table", () => {
    const html = renderToString(<StorySection />);
    expect(html).toContain(story.quote[0]);
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Priya Shah");
  });
});
