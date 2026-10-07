"use client";

import { useEffect, useState } from "react";

/**
 * useState that survives going to a detail screen and coming back (sessionStorage),
 * so the search and filters are still there.
 */
export function useSessionState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable: the state just won't persist.
    }
  }, [key, value]);

  return [value, setValue];
}
