"use client";

import { motion } from "motion/react";
import { ToggleGroup } from "radix-ui";
import { useId } from "react";
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

/**
 * iOS segmented control: the white thumb slides (spring) to the chosen segment.
 * Track: 12px radius, 2px padding, so the thumb is 10px (concentric).
 * Never allows an empty selection.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onValueChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const thumbId = useId();
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      aria-label={props["aria-label"]}
      className={cn("flex h-10 w-full rounded-[12px] bg-surface-2 p-[2px]", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            className={cn(
              "relative touch-target flex-1 cursor-pointer rounded-[10px] px-2 text-subhead",
              selected ? "font-semibold text-foreground" : "font-medium text-foreground/80",
            )}
          >
            {selected ? (
              <motion.span
                layoutId={thumbId}
                aria-hidden
                className="absolute inset-0 rounded-[10px] border border-black/[0.04] bg-[var(--segment-thumb)] shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)]"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
