import type { ReactNode } from "react";
import { SyncIndicator } from "./sync-indicator";

export function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
      <div className="min-w-0">
        {subtitle ? <p className="text-sm text-muted-foreground first-letter:uppercase">{subtitle}</p> : null}
        <h1 className="heading truncate text-3xl">{title}</h1>
      </div>
      <SyncIndicator />
    </header>
  );
}
