import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg pt-safe">
      <main className="pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav />
    </div>
  );
}
