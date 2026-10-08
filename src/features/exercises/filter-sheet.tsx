"use client";

import { Check } from "lucide-react";
import { useTranslations } from "use-intl";
import { Drawer } from "@/components/ui/drawer";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: readonly string[];
  value: string | null;
  label: (key: string) => string;
  onSelect: (value: string | null) => void;
}

/** Single-choice list in a bottom sheet (iOS checkmark list); picking applies it and closes. */
export function FilterSheet({ open, onOpenChange, title, options, value, label, onSelect }: FilterSheetProps) {
  const t = useTranslations("exercises.filters");
  const common = useTranslations("common");

  function pick(next: string | null) {
    onSelect(next);
    onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={title} closeLabel={common("cancel")}>
      {/* 28px sheet - 16px padding = 12px list corners. */}
      <ul className="overflow-hidden rounded-[12px] bg-surface">
        {[null, ...options].map((option) => {
          const selected = option === value;
          return (
            <li key={option ?? "any"} className="relative after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:origin-bottom after:scale-y-50 after:bg-separator last:after:hidden">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => pick(option)}
                className="flex h-12 w-full cursor-pointer items-center justify-between gap-2 px-4 text-left active:bg-surface-2"
              >
                <span className="truncate">{option ? label(option) : t("any")}</span>
                {selected ? <Check className="size-5 shrink-0 text-planned" strokeWidth={2.6} /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}
