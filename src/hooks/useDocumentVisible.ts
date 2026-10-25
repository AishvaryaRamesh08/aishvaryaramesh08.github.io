// Page visibility for pausing rAF loops and timers (design: "Visibility pause", Req 6.10).
import { useSyncExternalStore } from "react";

function subscribe(listener: () => void): () => void {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

function getSnapshot(): boolean {
  return document.visibilityState !== "hidden";
}

function getServerSnapshot(): boolean {
  return true;
}

/** `false` while the tab is hidden. */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
