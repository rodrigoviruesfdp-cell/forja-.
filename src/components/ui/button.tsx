import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[background-color,color,transform] select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-surface-2 text-foreground hover:bg-surface-2/80",
        outline: "border border-input bg-transparent hover:bg-surface-2",
        ghost: "bg-transparent hover:bg-surface-2",
        destructive: "bg-transparent text-destructive border border-destructive/50 hover:bg-destructive/10",
        link: "h-auto px-0 text-foreground underline underline-offset-4 hover:text-primary",
      },
      size: {
        // 44px minimum touch target everywhere; lg is for primary actions.
        default: "h-12 px-5 text-base",
        sm: "h-11 px-4 text-sm",
        lg: "h-14 px-6 text-lg",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
