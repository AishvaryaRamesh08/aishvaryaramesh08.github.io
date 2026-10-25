// Client-only rendering switch that never causes a hydration mismatch.
import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => () => {};

/**
 * `false` during prerender and hydration, `true` on the client right after hydration (and from
 * the first render when there is nothing to hydrate). Lets purely decorative, client-only UI such
 * as the Background_Layer stay out of the prerendered HTML without a mismatch.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
