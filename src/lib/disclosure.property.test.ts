// Property 27: At most one expanded disclosure.
// **Validates: Requirements 11.3, 11.9, 12.2**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  disclosureGroupReducer,
  initialDisclosureGroupState,
  isExpanded,
  type DisclosureGroupAction,
  type DisclosureGroupState,
} from "./disclosure";

/** Simple model of the group: the id of the one expanded item, or null. */
function model(expanded: number | null, action: DisclosureGroupAction<number>): number | null {
  switch (action.type) {
    case "toggle":
      return expanded === action.id ? null : action.id;
    case "open":
      return action.id;
    case "close":
      return expanded === action.id ? null : expanded;
    case "collapseAll":
      return null;
  }
}

/** A group size (1..8) and a sequence of actions over ids `0..size-1`. */
const groupAndActions = fc.integer({ min: 1, max: 8 }).chain((size) => {
  const id = fc.integer({ min: 0, max: size - 1 });
  const action: fc.Arbitrary<DisclosureGroupAction<number>> = fc.oneof(
    { weight: 4, arbitrary: id.map((i) => ({ type: "toggle", id: i }) as const) },
    { weight: 2, arbitrary: id.map((i) => ({ type: "open", id: i }) as const) },
    { weight: 2, arbitrary: id.map((i) => ({ type: "close", id: i }) as const) },
    { weight: 1, arbitrary: fc.constant({ type: "collapseAll" } as const) },
  );
  return fc.record({ size: fc.constant(size), actions: fc.array(action, { maxLength: 40 }) });
});

const expandedIds = (state: DisclosureGroupState<number>, size: number) =>
  Array.from({ length: size }, (_, i) => i).filter((i) => isExpanded(state, i));

describe("Property 27: At most one expanded disclosure", () => {
  it("starts with every item collapsed", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), (size) => {
        expect(expandedIds(initialDisclosureGroupState<number>(), size)).toEqual([]);
      }),
    );
  });

  it("keeps at most one item expanded after every action, matching the model", () => {
    fc.assert(
      fc.property(groupAndActions, ({ size, actions }) => {
        let state = initialDisclosureGroupState<number>();
        let expected: number | null = null;
        for (const action of actions) {
          const next = disclosureGroupReducer(state, action);
          expected = model(expected, action);

          const expanded = expandedIds(next, size);
          expect(expanded.length).toBeLessThanOrEqual(1);
          expect(next.expandedId).toBe(expected);
          expect(expanded).toEqual(expected === null ? [] : [expected]);

          // Unchanged state is returned as the same object (lets useReducer skip re-renders).
          if (next.expandedId === state.expandedId && action.type !== "toggle") expect(next).toBe(state);
          state = next;
        }
      }),
    );
  });

  it("toggling a collapsed item expands only it; toggling the expanded item leaves none expanded", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }).chain((size) =>
          fc.record({
            size: fc.constant(size),
            current: fc.option(fc.integer({ min: 0, max: size - 1 }), { nil: null }),
            target: fc.integer({ min: 0, max: size - 1 }),
          }),
        ),
        ({ size, current, target }) => {
          const next = disclosureGroupReducer({ expandedId: current }, { type: "toggle", id: target });
          expect(expandedIds(next, size)).toEqual(current === target ? [] : [target]);
        },
      ),
    );
  });
});
