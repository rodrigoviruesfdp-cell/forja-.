"use client";

import { Check } from "lucide-react";
import { useTranslations } from "use-intl";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: readonly string[];
  value: string | null;
  label: (key: string) => string;
  onSelect: (value: string | null) => void;
}

/** Single-choice list in a bottom sheet; picking an option applies it and closes the sheet. */
export function FilterSheet({ open, onOpenChange, title, options, value, label, onSelect }: FilterSheetProps) {
  const t = useTranslations("exercises.filters");
  const common = useTranslations("common");

  function pick(next: string | null) {
    onSelect(next);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} closeLabel={common("cancel")}>
      <ul className="grid grid-cols-2 gap-2">
        {[null, ...options].map((option) => {
          const selected = option === value;
          return (
            <li key={option ?? "any"}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => pick(option)}
                className={cn(
                  "flex h-12 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm font-medium",
                  selected ? "border-primary bg-primary/10" : "border-input bg-background",
                )}
              >
                <span className="truncate">{option ? label(option) : t("any")}</span>
                {selected ? <Check className="size-4 shrink-0 text-primary" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
