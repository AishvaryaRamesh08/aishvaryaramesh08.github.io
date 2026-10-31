import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { journey } from "../../data/journey";
import JourneyChart from "./JourneyChart";

describe("JourneyChart", () => {
  it("renders the accessible SVG step chart and visible data labels", () => {
    render(<JourneyChart />);
    const group = screen.getByRole("group", { name: "Career journey" });
    expect(within(group).getAllByTitle("Education and career journey")).toHaveLength(2);
    expect(within(group).getAllByText(/Four stages rise/)).toHaveLength(2);

    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(journey.length * 2);
    for (const stage of journey) {
      expect(within(group).getAllByText(stage.label).length).toBeGreaterThan(0);
      expect(within(group).getAllByText(stage.organization).length).toBeGreaterThan(0);
      expect(within(group).getAllByText(stage.years).length).toBeGreaterThan(0);
    }
    expect(within(group).getAllByText("Current")).toHaveLength(2);
  });

  it("defaults the detail panel to the current stage", () => {
    render(<JourneyChart />);
    const currentButton = screen.getAllByRole("button", { name: /Graduate student/ })[0];
    expect(currentButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Graduate student", { selector: "h3" })).toBeInTheDocument();
    for (const line of journey[3].detail) expect(screen.getAllByText(line).length).toBeGreaterThan(0);
  });

  it("updates detail content on focus, hover, and activation", async () => {
    const user = userEvent.setup();
    render(<JourneyChart />);
    const internship = screen.getAllByRole("button", { name: /Internship/ })[0];

    fireEvent.focus(internship);
    expect(internship).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Internship", { selector: "h3" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Undergraduate/ })[0]);
    expect(screen.getAllByRole("button", { name: /Undergraduate/ })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Undergraduate", { selector: "h3" })).toBeInTheDocument();
  });
});
