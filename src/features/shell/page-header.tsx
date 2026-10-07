"use client";

import type { ReactNode } from "react";
import { BackButton } from "./back-button";
import { ProfileButton } from "./profile-button";
import { SyncIndicator } from "./sync-indicator";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Shows a back arrow; the value is where to go if there is no history. */
  backFallback?: string;
  /** Hide the profile shortcut (on the profile screen itself). */
  hideProfile?: boolean;
}

export function PageHeader({ title, subtitle, backFallback, hideProfile = false }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
      <div className="flex min-w-0 items-center gap-1">
        {backFallback ? <BackButton fallback={backFallback} /> : null}
        <div className="min-w-0">
          {subtitle ? <p className="text-sm text-muted-foreground first-letter:uppercase">{subtitle}</p> : null}
          <h1 className="heading truncate text-3xl">{title}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <SyncIndicator />
        {hideProfile ? null : <ProfileButton />}
      </div>
    </header>
  );
}
