"use client";

import { type ReactNode, ViewTransition } from "react";

/**
 * Wraps each screen so navigations animate like iOS (push/pop) with the View Transitions
 * API. The direction lives in <html data-nav>; without browser support nothing animates.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div className="min-h-dvh bg-background">{children}</div>
    </ViewTransition>
  );
}
