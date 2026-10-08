"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * iOS "inset grouped" list: a rounded card of rows separated by hairlines that start at the
 * text (not at the edge), with an optional small caps header and a footnote below.
 */
export function Group({
  title,
  footer,
  id,
  className,
  children,
}: {
  title?: ReactNode;
  footer?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("flex scroll-mt-[calc(var(--nav-h)+0.5rem)] flex-col gap-1.5", className)}>
      {title ? (
        <h2 className="tracking-caption px-4 text-footnote font-normal text-muted-foreground uppercase">{title}</h2>
      ) : null}
      <div className="overflow-hidden rounded-[var(--outer-r)] border bg-surface shadow-card [--outer-p:0px] [--outer-r:16px]">
        {children}
      </div>
      {footer ? <div className="px-4 text-footnote text-muted-foreground">{footer}</div> : null}
    </section>
  );
}

/** Hairline at the bottom of every row but the last, inset by --sep-inset (16px by default). */
const rowBase =
  "relative flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left after:absolute after:right-0 after:bottom-0 after:left-[var(--sep-inset,1rem)] after:h-px after:origin-bottom after:scale-y-50 after:bg-separator last:after:hidden";

export function GroupRow({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(rowBase, className)} {...props} />;
}

/** Row that navigates: gray highlight while pressed and a chevron, like a table cell. */
export function GroupRowLink({
  className,
  children,
  chevron = true,
  ...props
}: ComponentProps<typeof Link> & { chevron?: boolean }) {
  return (
    <Link className={cn(rowBase, "cursor-pointer active:bg-surface-2", className)} {...props}>
      {children}
      {chevron ? <ChevronRight aria-hidden className="ml-auto size-5 shrink-0 text-tertiary-foreground" /> : null}
    </Link>
  );
}

/** Row that acts. `tone` follows iOS: plain text, tinted action, or red for destructive. */
export function GroupRowButton({
  className,
  tone = "default",
  type,
  ...props
}: ComponentProps<"button"> & { tone?: "default" | "action" | "destructive" }) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        rowBase,
        "cursor-pointer active:bg-surface-2 disabled:pointer-events-none disabled:opacity-40",
        tone === "action" && "font-medium text-planned",
        tone === "destructive" && "justify-center font-medium text-destructive",
        className,
      )}
      {...props}
    />
  );
}
