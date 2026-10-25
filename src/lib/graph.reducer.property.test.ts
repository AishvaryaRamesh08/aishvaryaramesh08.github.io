// Feature: portfolio-website, Property 2: Single failure state —
// for any graph and any sequence of activate(node) / reset actions applied to dependencyReducer,
// at most one node is failed after every action; when a node is failed the highlighted set equals
// downstream(edges, failed); activating the failed node or reset leaves no failed node and no
// highlights; activating a non-failed node makes it the only failed node.
// **Validates: Requirements 13.3, 13.5**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { DependencyEdge, JobId } from "../data/types";
import {
  dependencyReducer,
  downstream,
  initialDependencyState,
  type DependencyAction,
  type DependencyState,
} from "./graph";

/** Small id pool so activations hit graph nodes (and repeat) often; cycles and self-loops allowed. */
const arbJob: fc.Arbitrary<JobId> = fc.integer({ min: 0, max: 6 }).map((i) => `job-${i}`);

const arbEdges: fc.Arbitrary<DependencyEdge[]> = fc.array(
  fc.record({ from: arbJob, to: arbJob }),
  { maxLength: 20 },
);

const arbAction: fc.Arbitrary<DependencyAction> = fc.oneof(
  { weight: 4, arbitrary: arbJob.map((node) => ({ type: "activate", node }) as const) },
  { weight: 1, arbitrary: fc.constant({ type: "reset" } as const) },
);

const arbActions = fc.array(arbAction, { maxLength: 30 });

/** Reference model: the only thing that matters is which single job (if any) is failed. */
function modelStep(failed: JobId | null, action: DependencyAction): JobId | null {
  if (action.type === "reset") return null;
  return action.node === failed ? null : action.node;
}

function expectConsistent(state: DependencyState, edges: readonly DependencyEdge[]): void {
  expect(state.edges).toBe(edges);
  if (state.failed === null) {
    expect(state.highlighted.size).toBe(0);
  } else {
    expect([...state.highlighted].sort()).toEqual([...downstream(edges, state.failed)].sort());
    expect(state.highlighted.has(state.failed)).toBe(false);
  }
}

describe("Property 2: Single failure state", () => {
  it("keeps at most one failed job, with highlights equal to its downstream set, after every action", () => {
    fc.assert(
      fc.property(arbEdges, arbActions, (edges, actions) => {
        let state = initialDependencyState(edges);
        let modelFailed: JobId | null = null;
        expectConsistent(state, edges);

        for (const action of actions) {
          const before = state;
          state = dependencyReducer(state, action);
          modelFailed = modelStep(modelFailed, action);

          // `failed` is a single JobId | null, so "at most one" reduces to matching the model.
          expect(state.failed).toBe(modelFailed);
          expectConsistent(state, edges);

          if (action.type === "activate" && action.node !== before.failed) {
            // Activating a non-failed node makes it the only failed node (Req 13.3).
            expect(state.failed).toBe(action.node);
          } else {
            // Activating the failed node, or reset, clears everything (Req 13.5).
            expect(state.failed).toBeNull();
            expect(state.highlighted.size).toBe(0);
          }
        }
      }),
    );
  });

  it("reset always clears, and returns the same object when already clear", () => {
    fc.assert(
      fc.property(arbEdges, arbActions, (edges, actions) => {
        const state = actions.reduce(dependencyReducer, initialDependencyState(edges));
        const cleared = dependencyReducer(state, { type: "reset" });

        expect(cleared.failed).toBeNull();
        expect(cleared.highlighted.size).toBe(0);
        expect(cleared.edges).toBe(edges);
        if (state.failed === null) expect(cleared).toBe(state);
        expect(dependencyReducer(cleared, { type: "reset" })).toBe(cleared);
      }),
    );
  });

  it("the final state depends only on the last effective activation", () => {
    fc.assert(
      fc.property(arbEdges, arbActions, (edges, actions) => {
        const initial = initialDependencyState(edges);
        const final = actions.reduce(dependencyReducer, initial);

        // Replaying only the job left failed from a clean state gives the same observable state.
        const direct =
          final.failed === null ? initial : dependencyReducer(initial, { type: "activate", node: final.failed });

        expect(final.failed).toBe(direct.failed);
        expect([...final.highlighted]).toEqual([...direct.highlighted]);
      }),
    );
  });
});
