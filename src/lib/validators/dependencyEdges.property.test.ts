// Feature: portfolio-website, Property 3: Dependency edge validation —
// for any job list and edge list, the edge validator reports exactly the edges whose `from` or `to`
// is not a defined job id, each error naming the edge's index and both endpoints, and reports no
// errors when every endpoint is defined.
// **Validates: Requirements 13.2**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { DependencyEdge } from "../../data/types";
import { checkEdgeEndpoints } from "./dependencyEdges";
import { CONTENT_FILES } from "./types";

/** Fictional snake_case job id, e.g. "load_ledger", "rpt_daily". */
const arbJobId = fc.stringMatching(/^[a-z][a-z0-9_]{0,11}$/);

/**
 * A universe of distinct ids split into defined jobs and unknown ids, plus edges drawn from the
 * whole universe so generated edges mix valid, half-valid and fully unknown endpoints.
 */
const arbScenario = fc
  .uniqueArray(arbJobId, { minLength: 1, maxLength: 20 })
  .chain((universe) =>
    fc
      .tuple(
        fc.subarray(universe),
        fc.array(fc.record({ from: fc.constantFrom(...universe), to: fc.constantFrom(...universe) }), {
          maxLength: 30,
        }),
      )
      .map(([jobIds, edges]) => ({ jobIds: new Set(jobIds), edges: edges as DependencyEdge[] })),
  );

/** Defined jobs and edges whose endpoints are all drawn from those jobs. */
const arbValidScenario = fc.uniqueArray(arbJobId, { minLength: 1, maxLength: 20 }).chain((jobIds) =>
  fc
    .array(fc.record({ from: fc.constantFrom(...jobIds), to: fc.constantFrom(...jobIds) }), { maxLength: 30 })
    .map((edges) => ({ jobIds: new Set(jobIds), edges: edges as DependencyEdge[] })),
);

describe("Property 3: Dependency edge validation", () => {
  it("reports exactly the edges with an unknown endpoint, naming the index and both endpoints", () => {
    fc.assert(
      fc.property(arbScenario, ({ jobIds, edges }) => {
        const errors = checkEdgeEndpoints(jobIds, edges);

        const badIndices = edges
          .map((edge, i) => ({ edge, i }))
          .filter(({ edge }) => !jobIds.has(edge.from) || !jobIds.has(edge.to))
          .map(({ i }) => i);

        // Exactly the invalid edges, in order, one error each.
        expect(errors.map((e) => e.path)).toEqual(badIndices.map((i) => `edges[${i}]`));

        errors.forEach((error, k) => {
          const i = badIndices[k]!;
          const { from, to } = edges[i]!;
          expect(error.file).toBe(CONTENT_FILES.dependencyDemo);
          expect(error.message).toContain(`(edge ${i})`);
          expect(error.message).toContain(`"${from}" → "${to}"`);

          // The "unknown job(s)" list names exactly the undefined endpoints.
          const listed = error.message.split(/unknown jobs? /)[1] ?? "";
          const listedIds = [...listed.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
          const unknown = [...new Set([from, to])].filter((id) => !jobIds.has(id));
          expect(listedIds).toEqual(unknown);
        });
      }),
    );
  });

  it("reports no errors when every endpoint is a defined job", () => {
    fc.assert(
      fc.property(arbValidScenario, ({ jobIds, edges }) => {
        expect(checkEdgeEndpoints(jobIds, edges)).toEqual([]);
      }),
    );
  });
});
