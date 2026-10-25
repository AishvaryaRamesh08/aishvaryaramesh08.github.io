// Property 27 (component level): at most one `aria-expanded="true"` in a rendered disclosure group.
// **Validates: Requirements 11.3, 11.9, 12.2**
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Disclosure, DisclosurePanel, useDisclosureGroup, type DisclosureGroup } from "./Disclosure";

function Group({ size, onGroup }: { size: number; onGroup: (group: DisclosureGroup<number>) => void }) {
  const group = useDisclosureGroup<number>();
  onGroup(group);
  return (
    <div>
      {Array.from({ length: size }, (_, i) => (
        <div key={i}>
          <Disclosure expanded={group.isExpanded(i)} controls={`item-${i}-panel`} onToggle={() => group.toggle(i)}>
            {`item ${i}`}
          </Disclosure>
          <DisclosurePanel id={`item-${i}-panel`} expanded={group.isExpanded(i)}>
            {`item ${i} details`}
          </DisclosurePanel>
        </div>
      ))}
    </div>
  );
}

type Step = { kind: "click" | "open" | "close"; id: number } | { kind: "collapseAll" };

const groupAndSteps = fc.integer({ min: 1, max: 5 }).chain((size) => {
  const id = fc.integer({ min: 0, max: size - 1 });
  const step: fc.Arbitrary<Step> = fc.oneof(
    { weight: 4, arbitrary: id.map((i) => ({ kind: "click", id: i }) as const) },
    { weight: 1, arbitrary: id.map((i) => ({ kind: "open", id: i }) as const) },
    { weight: 1, arbitrary: id.map((i) => ({ kind: "close", id: i }) as const) },
    { weight: 1, arbitrary: fc.constant({ kind: "collapseAll" } as const) },
  );
  return fc.record({ size: fc.constant(size), steps: fc.array(step, { maxLength: 15 }) });
});

describe("Property 27: rendered disclosure group", () => {
  it("never shows more than one expanded button or visible panel", () => {
    fc.assert(
      fc.property(groupAndSteps, ({ size, steps }) => {
        let group: DisclosureGroup<number> | undefined;
        try {
          render(<Group size={size} onGroup={(g) => (group = g)} />);
          let expected: number | null = null;
          for (const step of steps) {
            if (step.kind === "click") {
              fireEvent.click(screen.getByRole("button", { name: `item ${step.id}` }));
              expected = expected === step.id ? null : step.id;
            } else if (step.kind === "open") {
              act(() => group!.open(step.id));
              expected = step.id;
            } else if (step.kind === "close") {
              act(() => group!.close(step.id));
              if (expected === step.id) expected = null;
            } else {
              act(() => group!.collapseAll());
              expected = null;
            }

            const buttons = screen.getAllByRole("button");
            const expandedButtons = buttons.filter((b) => b.getAttribute("aria-expanded") === "true");
            expect(expandedButtons.length).toBeLessThanOrEqual(1);
            expect(expandedButtons.map((b) => b.textContent)).toEqual(expected === null ? [] : [`item ${expected}`]);
            const visiblePanels = buttons
              .map((b) => document.getElementById(b.getAttribute("aria-controls")!)!)
              .filter((panel) => !panel.hidden);
            expect(visiblePanels.map((p) => p.id)).toEqual(expected === null ? [] : [`item-${expected}-panel`]);
          }
        } finally {
          cleanup();
        }
      }),
    );
  });
});
