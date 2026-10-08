"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLMotionProps, motion } from "motion/react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { PRESS } from "@/components/motion/spring";
import { cn } from "@/lib/utils";

/**
 * Capsule buttons, as in iOS. Only `primary` uses the brand yellow: one per screen,
 * for the main action. Press feedback is a spring scale (motion), never a CSS transition.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-surface-2 text-foreground",
        outline: "border bg-surface text-foreground shadow-card",
        ghost: "bg-transparent text-foreground hover:bg-surface-2",
        destructive: "bg-destructive/12 text-destructive",
        link: "h-auto px-0 text-foreground underline underline-offset-4",
      },
      size: {
        // 44px minimum touch target everywhere; lg is for the main action of a screen.
        default: "h-12 px-6 text-body",
        sm: "h-11 px-4 text-subhead",
        lg: "h-[54px] px-7 text-headline",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonStyleProps = VariantProps<typeof buttonVariants>;

export type ButtonProps = HTMLMotionProps<"button"> & ButtonStyleProps;

export function Button({ className, variant, size, type, ...props }: ButtonProps) {
  return (
    <motion.button
      data-slot="button"
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...PRESS}
      {...props}
    />
  );
}

const MotionLink = motion.create(Link);

type ButtonLinkProps = ComponentProps<typeof MotionLink> & ButtonStyleProps;

/** A link that looks and presses like a button. */
export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <MotionLink className={cn(buttonVariants({ variant, size, className }))} {...PRESS} {...props} />;
}

export { buttonVariants };
