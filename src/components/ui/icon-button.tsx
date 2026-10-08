"use client";

import { type HTMLMotionProps, motion } from "motion/react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { PRESS } from "@/components/motion/spring";
import { cn } from "@/lib/utils";

/** Round "glass" button for bars (back, add, more), 44px like iOS. */
const base =
  "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border text-foreground material shadow-[0_2px_10px_rgb(0_0_0/0.06)] [&_svg]:size-[22px] [&_svg]:shrink-0 disabled:pointer-events-none disabled:opacity-40";

export function IconButton({ className, type, ...props }: HTMLMotionProps<"button">) {
  return <motion.button type={type ?? "button"} className={cn(base, className)} {...PRESS} {...props} />;
}

const MotionLink = motion.create(Link);

export function IconLink({ className, ...props }: ComponentProps<typeof MotionLink>) {
  return <MotionLink className={cn(base, className)} {...PRESS} {...props} />;
}
