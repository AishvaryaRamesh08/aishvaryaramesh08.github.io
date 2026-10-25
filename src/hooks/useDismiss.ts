// Dismissal hooks for overlays: menus, lightboxes, the Journey tooltip and the constellation
// (design: Hooks). Both always call the latest handler and listen only while `active`.
import { useEffect, useEffectEvent, type RefObject } from "react";

/** Calls `handler` when Escape is pressed anywhere in the document while `active`. */
export function useEscapeKey(handler: (event: KeyboardEvent) => void, active: boolean): void {
  const onEscape = useEffectEvent(handler);
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing) onEscape(event);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active]);
}

type ElementRef = RefObject<Element | null>;

/**
 * Calls `handler` on a pointer press (mouse, touch or pen) that starts outside every element in
 * `refs` while `active`. Listens in the capture phase, so handlers that stop propagation inside
 * the page can't hide the tap.
 */
export function useOutsideTap(
  refs: ElementRef | readonly ElementRef[],
  handler: (event: PointerEvent) => void,
  active: boolean,
): void {
  const onOutside = useEffectEvent((event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const list: readonly ElementRef[] = Array.isArray(refs) ? refs : [refs as ElementRef];
    if (list.some((ref) => ref.current?.contains(target))) return;
    handler(event);
  });
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => onOutside(event);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [active]);
}
