import type { ReactNode } from "react";
import { ActiveSessionPill, ActiveSessionSpacer } from "@/features/session/active-session-pill";
import { BottomNav } from "./bottom-nav";
import { NavDirectionTracker } from "./nav-direction";
import { UpdateNotifier } from "./update-notifier";

/**
 * The page lives in the vaul wrapper (it scales back behind sheets, like iOS);
 * the tab bar stays outside so it is never moved by that effect.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <NavDirectionTracker />
      <div data-vaul-drawer-wrapper="" className="mx-auto min-h-dvh max-w-lg bg-background">
        <main className="pb-[var(--tabbar-space)]">
          {children}
          <ActiveSessionSpacer />
        </main>
      </div>
      <UpdateNotifier />
      <ActiveSessionPill />
      <BottomNav />
    </>
  );
}
