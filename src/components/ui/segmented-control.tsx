"use client";

import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onValueChange: (value: T) => void;
  "aria-label": string;
  className?: string;
}

/** Single-choice toggle (kg/lb, idioma, tema). Never allows an empty selection. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onValueChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      aria-label={props["aria-label"]}
      className={cn("flex h-12 w-full rounded-md bg-surface-2 p-1", className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            "flex-1 rounded-[calc(var(--radius)-6px)] text-base font-semibold text-muted-foreground transition-colors",
            "data-[state=on]:bg-surface data-[state=on]:text-foreground data-[state=on]:shadow-[inset_0_-2px_0_var(--primary)]",
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
