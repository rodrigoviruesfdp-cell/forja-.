import { useSyncExternalStore } from "react";

/**
 * Whether this phone shows the sample data instead of your own (per account, so another
 * account on the same phone is not affected). Kept in localStorage: reopening the app stays
 * in the sample until you leave it.
 */
const storageKey = (userId: string) => `forja.demo.${userId}`;
const listeners = new Set<() => void>();

export function isDemoMode(userId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function setDemoMode(userId: string, on: boolean): void {
  try {
    if (on) window.localStorage.setItem(storageKey(userId), "1");
    else window.localStorage.removeItem(storageKey(userId));
  } catch {
    // Private mode without storage: nothing to remember.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemoMode(userId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isDemoMode(userId),
    () => false,
  );
}
