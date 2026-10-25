// Modal focus trap for the Mobile_Menu and the two lightboxes (design D9, Req 7.12, 16.9, 20.9).
// These are the only focus traps on the page (Req 28.4): they hold focus while active and
// release it, with the background restored, as soon as they deactivate or unmount.
import { useEffect, useEffectEvent, type RefObject } from "react";
import { getFocusableElements, getOutsideSiblings } from "../lib/focus";

/** An element, a ref to one, or nothing. */
export type FocusTarget = RefObject<HTMLElement | null> | HTMLElement | null | undefined;

export interface FocusTrapOptions {
  /** The trap runs only while `true`; turning it off restores the background and focus. */
  active: boolean;
  /**
   * Focused when the trap deactivates. Defaults to the element that had focus when the trap
   * activated. Pass the opener explicitly: Safari doesn't focus buttons on click.
   */
  returnFocusTo?: FocusTarget;
  /** Focused when the trap activates. Defaults to the first focusable element, else the container. */
  initialFocus?: FocusTarget;
  /**
   * Elements made `inert` while active. Defaults to everything outside the container
   * (`getOutsideSiblings`), which covers the header, `main` and `footer`.
   */
  inertTargets?: () => Iterable<Element>;
}

function resolve(target: FocusTarget): HTMLElement | null {
  if (!target) return null;
  return target instanceof HTMLElement ? target : target.current;
}

/**
 * While `active`: makes the background `inert`, moves focus into `containerRef`, and cycles
 * Tab / Shift+Tab between its first and last focusable elements. On deactivation it removes
 * only the `inert` attributes it added and returns focus. The container should accept focus
 * (`tabIndex={-1}`) in case it has no focusable children.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, options: FocusTrapOptions): void {
  const { active } = options;
  const readOptions = useEffectEvent(() => options);

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;
    const { returnFocusTo, initialFocus, inertTargets } = readOptions();
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Leave elements that were already inert (e.g. by an outer trap) for their owner to restore.
    const madeInert: Element[] = [];
    for (const element of inertTargets ? inertTargets() : getOutsideSiblings(container)) {
      if (element.contains(container) || element.hasAttribute("inert")) continue;
      element.setAttribute("inert", "");
      madeInert.push(element);
    }

    if (!container.contains(document.activeElement)) {
      (resolve(initialFocus) ?? getFocusableElements(container)[0] ?? container).focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const outside = !container.contains(current) || current === container;
      if (event.shiftKey && (outside || current === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || current === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Restore the background first: inert elements cannot take focus.
      for (const element of madeInert) element.removeAttribute("inert");
      const target = resolve(returnFocusTo) ?? previouslyFocused;
      if (target?.isConnected) target.focus();
    };
  }, [active, containerRef]);
}
