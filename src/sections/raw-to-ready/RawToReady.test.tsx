import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { rawToReady } from "../../data/rawToReady";
import RawToReady from "./RawToReady";

describe("RawToReady", () => {
  it("renders the raw, cleaned and ready stages from the shared sample data", () => {
    render(<RawToReady />);

    expect(screen.getByRole("heading", { name: rawToReady.title })).toBeInTheDocument();
    expect(screen.getByText(rawToReady.subtitle)).toBeInTheDocument();
    expect(screen.getByText(rawToReady.sampleCaption)).toBeInTheDocument();
    expect(document.querySelectorAll("#raw-to-ready [data-flow-arrow]")).toHaveLength(2);

    const raw = screen.getByRole("tabpanel", { name: rawToReady.panelLabels.raw });
    expect(within(raw).getAllByRole("row")).toHaveLength(9);
    expect(within(raw).getByText("duplicate")).toBeInTheDocument();
    expect(within(raw).getAllByText("date format")).toHaveLength(2);
    expect(within(raw).getByText("text amount")).toBeInTheDocument();

    const clean = screen.getByRole("tabpanel", { name: rawToReady.panelLabels.clean });
    expect(within(clean).getAllByRole("row")).toHaveLength(6);
    expect(within(clean).getByText(/1004 · 1007/)).toBeInTheDocument();

    const ready = screen.getByRole("tabpanel", { name: rawToReady.panelLabels.ready });
    expect(within(ready).getByText(rawToReady.summary)).toBeInTheDocument();
    expect(ready.querySelectorAll("rect[tabindex='0']")).toHaveLength(5);
  });

  it("reveals fix annotations when Show fixes is enabled", async () => {
    const user = userEvent.setup();
    render(<RawToReady />);
    const clean = screen.getByRole("tabpanel", { name: rawToReady.panelLabels.clean });
    const toggle = within(clean).getByRole("button", { name: rawToReady.showFixesLabel });

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(within(clean).getByText("duplicate removed")).toBeInTheDocument();
    expect(within(clean).getAllByText("date standardized")).toHaveLength(2);
    expect(within(clean).getByText("type cast")).toBeInTheDocument();
    expect(within(clean).getAllByText("casing normalized")).toHaveLength(3);
  });

  it("supports wrapping arrow-key navigation through the stage tabs", () => {
    render(<RawToReady />);
    const tabs = screen.getAllByRole("tab");

    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
    expect(tabs[2]).toHaveFocus();
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(tabs[2], { key: "ArrowRight" });
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("exposes each ready-chart bar value to keyboard users", () => {
    render(<RawToReady />);
    expect(screen.getByLabelText(/03\/04, Amount 120\.50 dollars/)).toBeInTheDocument();
    const chart = screen.getByRole("group", { name: rawToReady.chart.title });
    const firstBar = chart.querySelector("rect[aria-label]");
    expect(firstBar).not.toBeNull();
    fireEvent.focus(firstBar!);
    expect(within(chart).getByText("120.50")).toBeInTheDocument();
  });
});
