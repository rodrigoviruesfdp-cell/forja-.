"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Action {
  key: string;
  label: string;
  Icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/** Menu inside a sheet: grouped rows with an icon on the right, like an iOS context menu. */
export function ActionList({ actions, className }: { actions: Action[]; className?: string }) {
  return (
    <ul className={cn("overflow-hidden rounded-[12px] bg-surface", className)}>
      {actions.map(({ key, label, Icon, onSelect, destructive, disabled }) => (
        <li
          key={key}
          className="relative after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:origin-bottom after:scale-y-50 after:bg-separator last:after:hidden"
        >
          <button
            type="button"
            disabled={disabled}
            onClick={onSelect}
            className={cn(
              "flex h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-4 text-left active:bg-surface-2 disabled:pointer-events-none disabled:opacity-40",
              destructive && "text-destructive",
            )}
          >
            <span className="truncate">{label}</span>
            <Icon aria-hidden className="size-5 shrink-0" strokeWidth={2} />
          </button>
        </li>
      ))}
    </ul>
  );
}
