"use client";

import { useEffect } from "react";

export type NavDirection = "forward" | "back" | "tab";

let clearTimer: number | undefined;

/**
 * Marks the direction of the next navigation on <html data-nav>, so the page transition
 * (globals.css) pushes from the right, pops back, or switches tabs without animation.
 * Cleared shortly after, so a later programmatic navigation does not inherit it.
 */
export function setNavDirection(direction: NavDirection) {
  const root = document.documentElement;
  root.dataset.nav = direction;
  window.clearTimeout(clearTimer);
  clearTimer = window.setTimeout(() => {
    delete root.dataset.nav;
  }, 1500);
}

/** Watches link taps (tab bar = "tab", links can set data-nav, the rest drill down) and history back. */
export function NavDirectionTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      const explicit = link.dataset.nav as NavDirection | undefined;
      setNavDirection(explicit ?? (link.closest("[data-nav-tabs]") ? "tab" : "forward"));
    };
    const onPopState = () => setNavDirection("back");
    // Capture phase: Next's <Link> prevents the default action before the event bubbles up.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
  return null;
}
