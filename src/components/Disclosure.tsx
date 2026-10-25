import { useCallback, useMemo, useReducer, type ComponentPropsWithRef, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../lib/cx";
import {
  disclosureGroupReducer,
  initialDisclosureGroupState,
  type DisclosureGroupAction,
  type DisclosureId,
} from "../lib/disclosure";

export interface DisclosureProps
  extends Omit<ComponentPropsWithRef<"button">, "aria-expanded" | "aria-controls" | "type"> {
  /** Whether the controlled panel is shown; mirrored to `aria-expanded` (Req 11.8). */
  expanded: boolean;
  /** `id` of the panel this button shows and hides; mirrored to `aria-controls`. */
  controls: string;
  /** Called on activation (click, tap, Enter or Space via the native button). */
  onToggle?: () => void;
}

/**
 * Disclosure trigger: a native `<button>` so Tab reaches it in DOM order and Enter/Space activate
 * it. It never moves focus, so collapsing leaves focus on the button (Req 12.6). Visual state
 * (e.g. the active-stage glow, Req 11.6) is styled by the caller via `aria-expanded:` variants.
 */
export function Disclosure({ expanded, controls, onToggle, onClick, className, children, ...rest }: DisclosureProps) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      className={cx("cursor-pointer", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onToggle?.();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface DisclosurePanelProps extends Omit<HTMLAttributes<HTMLElement>, "hidden"> {
  /** Must equal the trigger's `controls`. */
  id: string;
  expanded: boolean;
  children: ReactNode;
  as?: "div" | "section";
}

/**
 * Panel controlled by a `Disclosure`. Stays in the DOM while collapsed (with `hidden`) so the
 * trigger's `aria-controls` always resolves, and SSR output matches the first client render.
 */
export function DisclosurePanel({ id, expanded, as: Tag = "div", children, ...rest }: DisclosurePanelProps) {
  return (
    <Tag id={id} hidden={!expanded} {...rest}>
      {children}
    </Tag>
  );
}

export interface DisclosureGroup<Id extends DisclosureId> {
  /** The expanded (active) item, or `null` when all are collapsed. */
  expandedId: Id | null;
  isExpanded: (id: Id) => boolean;
  toggle: (id: Id) => void;
  open: (id: Id) => void;
  close: (id: Id) => void;
  collapseAll: () => void;
  dispatch: (action: DisclosureGroupAction<Id>) => void;
}

/** `useReducer` wrapper around `disclosureGroupReducer`; starts with everything collapsed. */
export function useDisclosureGroup<Id extends DisclosureId = string>(): DisclosureGroup<Id> {
  const [state, dispatch] = useReducer(disclosureGroupReducer<Id>, undefined, initialDisclosureGroupState<Id>);
  const toggle = useCallback((id: Id) => dispatch({ type: "toggle", id }), []);
  const open = useCallback((id: Id) => dispatch({ type: "open", id }), []);
  const close = useCallback((id: Id) => dispatch({ type: "close", id }), []);
  const collapseAll = useCallback(() => dispatch({ type: "collapseAll" }), []);
  const { expandedId } = state;
  return useMemo(
    () => ({
      expandedId,
      isExpanded: (id: Id) => expandedId === id,
      toggle,
      open,
      close,
      collapseAll,
      dispatch,
    }),
    [expandedId, toggle, open, close, collapseAll],
  );
}
