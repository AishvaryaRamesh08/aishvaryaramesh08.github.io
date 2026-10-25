// Disclosure-group state shared by the Pipeline stage nodes (Req 11.3, 11.9) and the Case_Study
// cards (Req 12.2). Pure and SSR-safe: the state is just the id of the one expanded item, so
// "at most one expanded" holds by construction (Property 27).

/** Id of an item in a disclosure group (stage id, project slug, or index). */
export type DisclosureId = string | number;

export interface DisclosureGroupState<Id extends DisclosureId = DisclosureId> {
  /** The expanded (and active) item, or `null` when every item is collapsed. */
  readonly expandedId: Id | null;
}

export type DisclosureGroupAction<Id extends DisclosureId = DisclosureId> =
  /** Expand `id` (collapsing any other) or, if `id` is already expanded, collapse it. */
  | { readonly type: "toggle"; readonly id: Id }
  /** Expand `id`, collapsing any other. No-op if already expanded. */
  | { readonly type: "open"; readonly id: Id }
  /** Collapse `id` if it is the expanded item; otherwise a no-op. */
  | { readonly type: "close"; readonly id: Id }
  /** Collapse every item. */
  | { readonly type: "collapseAll" };

/** Initial state: all items collapsed and none active (Req 11.1). */
export function initialDisclosureGroupState<Id extends DisclosureId = DisclosureId>(): DisclosureGroupState<Id> {
  return { expandedId: null };
}

/**
 * Reducer for a group in which at most one item is expanded. Returns the same state object when
 * an action changes nothing, so `useReducer` can skip re-rendering.
 */
export function disclosureGroupReducer<Id extends DisclosureId>(
  state: DisclosureGroupState<Id>,
  action: DisclosureGroupAction<Id>,
): DisclosureGroupState<Id> {
  switch (action.type) {
    case "toggle":
      return { expandedId: state.expandedId === action.id ? null : action.id };
    case "open":
      return state.expandedId === action.id ? state : { expandedId: action.id };
    case "close":
      return state.expandedId === action.id ? { expandedId: null } : state;
    case "collapseAll":
      return state.expandedId === null ? state : { expandedId: null };
  }
}

/** Whether `id` is the expanded item in `state`. */
export function isExpanded<Id extends DisclosureId>(state: DisclosureGroupState<Id>, id: Id): boolean {
  return state.expandedId === id;
}
