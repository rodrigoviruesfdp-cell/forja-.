"use client";

import { Camera, ChevronRight } from "lucide-react";
import { useTranslations } from "use-intl";
import { CardLink } from "@/components/ui/card";
import { PhotoImage } from "./photo-image";
import { usePhotos } from "./use-photos";

/** On the Progress tab: your latest progress photos, leading to all of them. */
export function PhotosCard() {
  const t = useTranslations("progress");
  const tPhotos = useTranslations("photos");
  const photos = usePhotos();
  if (!photos) return null;
  const latest = photos.slice(0, 3);
  return (
    <CardLink href="/progress/photos" data-nav="forward" size="tile" className="flex items-center gap-3">
      {latest.length > 0 ? (
        <span className="flex shrink-0 gap-1">
          {latest.map((photo, i) => (
            <PhotoImage
              key={photo.id}
              row={photo}
              className={`h-16 w-12 ${i === 0 ? "rounded-l-[12px]" : ""} ${i === latest.length - 1 ? "rounded-r-[12px]" : ""}`}
            />
          ))}
        </span>
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-planned/12 text-planned">
          <Camera className="size-6" strokeWidth={1.9} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-headline">{t("photos.title")}</span>
        <span className="text-footnote text-muted-foreground">
          {photos.length > 0 ? tPhotos("count", { count: photos.length }) : t("photos.empty")}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />
    </CardLink>
  );
}
