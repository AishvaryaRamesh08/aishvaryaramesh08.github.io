// Pure Dependency_Demo graph logic (Req 13.3, 13.4, 13.5, 13.7). No DOM access: the demo component
// dispatches node activations here and renders whatever state comes back, so the failure semantics
// can be property-tested directly (Design D5, Properties 1 and 2).
import type { DependencyEdge, JobId } from "../data/types";

/**
 * Every job reachable from `failed` by following one or more edges `from → to`, excluding
 * `failed` itself (Req 13.4). Breadth-first with a visited set, so cycles and self-loops
 * terminate and each job appears once. Insertion order is BFS order. An empty set means the
 * failed job has no downstream jobs (Req 13.7).
 */
export function downstream(edges: readonly DependencyEdge[], failed: JobId): Set<JobId> {
  const successors = new Map<JobId, JobId[]>();
  for (const { from, to } of edges) {
    const list = successors.get(from);
    if (list) list.push(to);
    else successors.set(from, [to]);
  }

  const visited = new Set<JobId>([failed]);
  const result = new Set<JobId>();
  const queue: JobId[] = [failed];
  for (let head = 0; head < queue.length; head++) {
    for (const next of successors.get(queue[head]!) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      result.add(next);
      queue.push(next);
    }
  }
  return result;
}

/** Demo state: at most one failed job, and the jobs downstream of it. */
export interface DependencyState {
  /** Graph the demo operates on; fixed for the life of the reducer. */
  readonly edges: readonly DependencyEdge[];
  /** The single failed job, or `null` when nothing is failed. */
  readonly failed: JobId | null;
  /** `downstream(edges, failed)` when a job is failed, otherwise empty. Never contains `failed`. */
  readonly highlighted: ReadonlySet<JobId>;
}

export type DependencyAction = { type: "activate"; node: JobId } | { type: "reset" };

const EMPTY: ReadonlySet<JobId> = new Set<JobId>();

/** Initial, unfailed state for `useReducer(dependencyReducer, edges, initialDependencyState)`. */
export function initialDependencyState(edges: readonly DependencyEdge[]): DependencyState {
  return { edges, failed: null, highlighted: EMPTY };
}

/**
 * - `activate` on a job that is not failed: replaces any previous failure with that job and
 *   highlights its downstream jobs (Req 13.3).
 * - `activate` on the failed job, or `reset`: clears the failure and every highlight (Req 13.5).
 */
export function dependencyReducer(state: DependencyState, action: DependencyAction): DependencyState {
  switch (action.type) {
    case "activate":
      if (action.node === state.failed) return initialDependencyState(state.edges);
      return {
        edges: state.edges,
        failed: action.node,
        highlighted: downstream(state.edges, action.node),
      };
    case "reset":
      return state.failed === null ? state : initialDependencyState(state.edges);
  }
}
