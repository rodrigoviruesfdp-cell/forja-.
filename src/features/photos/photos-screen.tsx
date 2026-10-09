"use client";

import { Camera, Columns2, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { PRESS } from "@/components/motion/spring";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card, CardLink } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { processPhoto } from "@/data/media/process";
import { defaultComparison, groupByMonth } from "@/domain/photos";
import type { Media } from "@/domain/schemas";
import { PageHeader } from "@/features/shell/page-header";
import { PhotoImage } from "./photo-image";
import { PhotoSheet, type PhotoSheetTarget } from "./photo-sheet";
import { PhotoViewer } from "./photo-viewer";
import { usePhotoFormat, usePhotos } from "./use-photos";

/** /progress/photos: your progress photos by month, the comparison, and adding new ones. */
export function PhotosScreen() {
  const t = useTranslations("photos");
  const fmt = usePhotoFormat();
  const photos = usePhotos();
  const input = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<PhotoSheetTarget | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  // The preview of a new photo is a blob URL: free it when the sheet goes.
  const previewUrl = sheet?.mode === "new" ? sheet.previewUrl : null;
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function pick(file: File | undefined) {
    if (!file) return;
    const id = toast.loading(t("processing"));
    try {
      const photo = await processPhoto(file);
      setSheet({ mode: "new", photo, previewUrl: URL.createObjectURL(photo.thumb) });
      toast.dismiss(id);
    } catch {
      toast.error(t("photoError"), { id });
    }
  }

  const header = (
    <PageHeader
      title={t("title")}
      backFallback="/progress"
      actions={
        <IconButton aria-label={t("add")} onClick={() => input.current?.click()}>
          <Plus />
        </IconButton>
      }
    />
  );

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      // Opened by the + and "Add your first photo" buttons; hidden from screen readers.
      aria-hidden
      tabIndex={-1}
      className="sr-only"
      onChange={(e) => {
        void pick(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (!photos) {
    return (
      <>
        {header}
        <Spinner className="mx-auto mt-10" />
      </>
    );
  }

  const comparison = defaultComparison(photos);
  const months = groupByMonth(photos);
  const indexOf = new Map(photos.map((photo, i) => [photo.id, i]));

  return (
    <>
      {header}
      {fileInput}
      <Stagger className="flex flex-col gap-6 px-4 pb-8">
        {photos.length === 0 ? (
          <StaggerItem>
            <Card className="flex flex-col items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-concentric bg-planned/12 text-planned">
                <Camera className="size-6" strokeWidth={1.9} />
              </span>
              <p className="text-callout text-muted-foreground">{t("empty")}</p>
              <Button className="w-full" onClick={() => input.current?.click()}>
                <Plus />
                {t("addFirst")}
              </Button>
            </Card>
          </StaggerItem>
        ) : null}

        {comparison ? (
          <StaggerItem>
            <CardLink href={`/progress/photos/compare?before=${comparison.before.id}&after=${comparison.after.id}`} data-nav="forward" size="tile" className="flex items-center gap-3">
              <span className="flex shrink-0 gap-1">
                <PhotoImage row={comparison.before} className="h-20 w-15 rounded-l-[12px]" />
                <PhotoImage row={comparison.after} className="h-20 w-15 rounded-r-[12px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-headline">
                  <Columns2 className="size-4.5" strokeWidth={2.2} />
                  {t("compare")}
                </span>
                <span className="text-footnote text-muted-foreground">{fmt.between(comparison.before.taken_at, comparison.after.taken_at)}</span>
              </span>
            </CardLink>
          </StaggerItem>
        ) : null}

        {months.map((group) => (
          <StaggerItem key={group.month}>
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-title-3 first-letter:uppercase">{fmt.month(group.month)}</h2>
              <div className="grid grid-cols-3 gap-1.5">
                {group.photos.map((photo: Media) => (
                  <motion.button
                    key={photo.id}
                    type="button"
                    onClick={() => setOpen(indexOf.get(photo.id) ?? 0)}
                    className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-[10px]"
                    {...PRESS}
                  >
                    <PhotoImage row={photo} className="size-full" />
                    <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-2 pt-4 pb-1.5 text-left text-caption-2 font-semibold text-white">
                      {fmt.shortDate(photo.taken_at)}
                      {photo.pose ? ` · ${t(`poses.${photo.pose}`)}` : ""}
                    </span>
                  </motion.button>
                ))}
              </div>
            </section>
          </StaggerItem>
        ))}

        {photos.length > 0 ? <p className="px-1 text-footnote text-muted-foreground">{t("privacy")}</p> : null}
      </Stagger>

      <PhotoSheet target={sheet} onOpenChange={(next) => (next ? null : setSheet(null))} />
      <AnimatePresence>
        {open !== null && photos.length > 0 ? (
          <PhotoViewer
            photos={photos}
            index={Math.min(open, photos.length - 1)}
            onIndexChange={setOpen}
            onClose={() => setOpen(null)}
            onEdit={(row) => setSheet({ mode: "edit", row })}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
