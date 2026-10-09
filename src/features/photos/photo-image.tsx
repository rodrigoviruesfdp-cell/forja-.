"use client";

import { CloudOff } from "lucide-react";
import { useTranslations } from "use-intl";
import type { PhotoVariant } from "@/data/media/media-sync";
import type { Media } from "@/domain/schemas";
import { cn } from "@/lib/utils";
import { usePhotoFormat, usePhotoUrl } from "./use-photos";

/**
 * A progress photo filling its box (cover by default). While the full size loads, the
 * thumbnail stands in; if neither is on this phone yet (no connection), a quiet placeholder.
 */
export function PhotoImage({
  row,
  variant = "thumb",
  fit = "cover",
  className,
  draggable = false,
}: {
  row: Media;
  variant?: PhotoVariant;
  fit?: "cover" | "contain";
  className?: string;
  draggable?: boolean;
}) {
  const t = useTranslations("photos");
  const fmt = usePhotoFormat();
  const thumb = usePhotoUrl(row, "thumb");
  const full = usePhotoUrl(variant === "full" ? row : null, "full");
  const url = variant === "full" ? (full ?? thumb) : thumb;
  const alt = t("photoAlt", { date: fmt.date(row.taken_at) });

  if (url === null || (variant === "full" && full === null && thumb === null)) {
    return (
      <div role="img" aria-label={`${alt}. ${t("unavailable")}`} className={cn("flex items-center justify-center bg-surface-2 text-tertiary-foreground", className)}>
        <CloudOff className="size-6" strokeWidth={1.8} />
      </div>
    );
  }
  if (url === undefined) return <div aria-hidden className={cn("animate-pulse bg-surface-2", className)} />;
  return (
    // A blob URL made on the phone: nothing for next/image to optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      draggable={draggable}
      className={cn(fit === "cover" ? "object-cover" : "object-contain", variant === "full" && !full && "blur-sm", className)}
    />
  );
}
