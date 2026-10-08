import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** iOS-style field: gray fill, no border, 12px corners. 17px text (never zooms on iOS). */
export const fieldClass =
  "w-full min-w-0 rounded-md bg-surface-2 px-4 text-body text-foreground placeholder:text-tertiary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-destructive/60 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldClass, "h-12", className)} {...props} />;
}
