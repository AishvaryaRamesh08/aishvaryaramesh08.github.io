// Shared matchMedia stores for useSyncExternalStore (design: Hooks, D3).
// SSR-safe: nothing touches `window` until a store is subscribed to or read on the client.
import { useSyncExternalStore } from "react";

export interface MediaQueryStore {
  /** Subscribes to `change` events of the query; returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Current match state on the client (`false` when matchMedia is unavailable). */
  getSnapshot: () => boolean;
}

const stores = new Map<string, MediaQueryStore>();

function hasMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function createMediaQueryStore(query: string): MediaQueryStore {
  const listeners = new Set<() => void>();
  // The MediaQueryList is held only while someone is subscribed, so a replaced
  // `window.matchMedia` (e.g. a test mock) is picked up on the next subscription.
  let mql: MediaQueryList | null = null;
  const notify = () => {
    for (const listener of [...listeners]) listener();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && hasMatchMedia()) {
        mql = window.matchMedia(query);
        mql.addEventListener("change", notify);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && mql) {
          mql.removeEventListener("change", notify);
          mql = null;
        }
      };
    },
    getSnapshot() {
      if (mql) return mql.matches;
      return hasMatchMedia() ? window.matchMedia(query).matches : false;
    },
  };
}

/** Returns the shared store for `query`, creating it on first use. */
export function getMediaQueryStore(query: string): MediaQueryStore {
  let store = stores.get(query);
  if (!store) {
    store = createMediaQueryStore(query);
    stores.set(query, store);
  }
  return store;
}

/**
 * Live `matchMedia(query).matches`. Renders `serverValue` during prerender and hydration,
 * then switches to the real value, so the prerendered markup never mismatches.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const store = getMediaQueryStore(query);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => serverValue);
}
