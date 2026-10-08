"use client";

import { type HTMLMotionProps, motion } from "motion/react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { PRESS_SOFT } from "@/components/motion/spring";
import { cn } from "@/lib/utils";

/**
 * Card geometry. Each size fixes the outer radius and the padding together, so children on
 * the padding edge can use `rounded-concentric` (radius = outer radius - padding).
 */
const SIZES = {
  /** 22 - 16 = 6px inside: text-first cards. */
  md: "[--outer-r:22px] [--outer-p:16px]",
  /** 24 - 12 = 12px inside: cards that hold an image or a tile flush with the padding. */
  tile: "[--outer-r:24px] [--outer-p:12px]",
  /** 28 - 20 = 8px inside: hero cards. */
  lg: "[--outer-r:28px] [--outer-p:20px]",
} as const;

type CardSize = keyof typeof SIZES;

const base = "rounded-[var(--outer-r)] border bg-surface p-[var(--outer-p)] shadow-card";

export function Card({ size = "md", className, ...props }: ComponentProps<"div"> & { size?: CardSize }) {
  return <div className={cn(base, SIZES[size], className)} {...props} />;
}

const MotionLink = motion.create(Link);

/** A whole card that navigates, with a spring press. */
export function CardLink({ size = "md", className, ...props }: ComponentProps<typeof MotionLink> & { size?: CardSize }) {
  return <MotionLink className={cn(base, SIZES[size], "block", className)} {...PRESS_SOFT} {...props} />;
}

/** A whole card that acts (opens a sheet, toggles), with a spring press. */
export function CardButton({ size = "md", className, type, ...props }: HTMLMotionProps<"button"> & { size?: CardSize }) {
  return (
    <motion.button
      type={type ?? "button"}
      className={cn(base, SIZES[size], "block w-full cursor-pointer text-left", className)}
      {...PRESS_SOFT}
      {...props}
    />
  );
}
