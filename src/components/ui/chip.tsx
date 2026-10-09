"use client";

import { type HTMLMotionProps, motion } from "motion/react";
import { PRESS } from "@/components/motion/spring";
import { cn } from "@/lib/utils";

interface ChipProps extends HTMLMotionProps<"button"> {
  active?: boolean;
}

/** Filter/toggle capsule. Selected = solid label color (the yellow is kept for main actions). */
export function Chip({ active = false, className, type = "button", ...props }: ChipProps) {
  return (
    <motion.button
      type={type}
      data-active={active}
      className={cn(
        "relative touch-target inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-subhead font-semibold whitespace-nowrap",
        active ? "bg-foreground text-background" : "bg-surface-2 text-foreground",
        className,
      )}
      {...PRESS}
      {...props}
    />
  );
}
