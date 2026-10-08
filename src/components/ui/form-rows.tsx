"use client";

import { ChevronsUpDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GroupRow } from "./group";

/**
 * Form rows for an inset grouped list (iOS Settings style). Fields are borderless inside
 * the row; the row is the field.
 */

export function TextRow({
  label,
  className,
  ...props
}: ComponentProps<"input"> & { label?: string }) {
  return (
    <GroupRow className="py-0">
      {label ? (
        <label htmlFor={props.id} className="w-32 shrink-0">
          {label}
        </label>
      ) : null}
      <input
        className={cn(
          "h-12 w-full min-w-0 bg-transparent text-body outline-none placeholder:text-tertiary-foreground aria-invalid:placeholder:text-destructive/70",
          label && "text-right text-muted-foreground focus:text-foreground",
          className,
        )}
        {...props}
      />
    </GroupRow>
  );
}

/** Label on the left, current value + chevrons on the right; the native picker opens on tap. */
export function SelectRow({
  label,
  valueLabel,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { label: string; valueLabel: ReactNode }) {
  return (
    <GroupRow className="cursor-pointer active:bg-surface-2 has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-ring has-[select:focus-visible]:ring-inset">
      <span className="shrink-0">{label}</span>
      <span className="ml-auto flex min-w-0 items-center gap-1 text-muted-foreground">
        <span className="truncate">{valueLabel}</span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-tertiary-foreground" />
      </span>
      <select
        aria-label={label}
        className={cn("absolute inset-0 cursor-pointer appearance-none opacity-0", className)}
        {...props}
      >
        {children}
      </select>
    </GroupRow>
  );
}

export function TextAreaRow({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <GroupRow className="py-0">
      <textarea
        className={cn(
          "min-h-24 w-full resize-none bg-transparent py-3 text-body leading-snug outline-none placeholder:text-tertiary-foreground",
          className,
        )}
        {...props}
      />
    </GroupRow>
  );
}
