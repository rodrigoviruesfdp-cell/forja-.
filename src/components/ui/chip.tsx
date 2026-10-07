import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface ChipProps extends ComponentProps<"button"> {
  active?: boolean;
}

/** Filter/toggle pill. 44px tall so it is easy to hit with a thumb. */
export function Chip({ active = false, className, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      data-active={active}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-surface text-foreground hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}
