"use client";

import { Share } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { PRESS } from "@/components/motion/spring";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { defaultComparison } from "@/domain/photos";
import type { Media } from "@/domain/schemas";
import { PageHeader } from "@/features/shell/page-header";
import { PhotoImage } from "./photo-image";
import { usePhotoFormat, usePhotos, useWeightsOn } from "./use-photos";

type Mode = "slider" | "sideBySide";
type Side = "before" | "after";

/** /progress/photos/compare?before=…&after=…: two photos, sliding over each other or side by side. */
export function CompareScreen() {
  const t = useTranslations("photos");
  const fmt = usePhotoFormat();
  const params = useSearchParams();
  const photos = usePhotos();
  const [mode, setMode] = useState<Mode>("slider");
  const [chosen, setChosen] = useState<{ before?: string; after?: string }>({});
  const [picking, setPicking] = useState<Side | null>(null);

  const byId = new Map((photos ?? []).map((photo) => [photo.id, photo]));
  const fallback = photos ? defaultComparison(photos) : null;
  const afterId = chosen.after ?? params.get("after");
  const after = (afterId ? byId.get(afterId) : undefined) ?? fallback?.after;
  const pool = photos?.filter((photo) => photo.id !== after?.id) ?? [];
  const beforeId = chosen.before ?? params.get("before");
  const before =
    (beforeId ? byId.get(beforeId) : undefined) ??
    // The oldest in the same pose as "after", or the oldest of all.
    [...pool].reverse().find((photo) => photo.pose === after?.pose) ??
    pool.at(-1);
  const weights = useWeightsOn([before?.taken_at, after?.taken_at].filter((date): date is string => !!date));

  if (!photos) {
    return (
      <>
        <PageHeader title={t("compare")} backFallback="/progress/photos" compact />
        <Spinner className="mx-auto mt-10" />
      </>
    );
  }
  if (!before || !after) {
    return (
      <>
        <PageHeader title={t("compare")} backFallback="/progress/photos" compact />
        <p className="px-4 pt-2 text-muted-foreground">{t("empty")}</p>
      </>
    );
  }

  // Older one on the left, whatever was picked first.
  const [left, right] = before.taken_at <= after.taken_at ? [before, after] : [after, before];
  const leftWeight = weights.get(left.taken_at);
  const rightWeight = weights.get(right.taken_at);
  const change = leftWeight && rightWeight ? rightWeight - leftWeight : null;

  return (
    <>
      <PageHeader title={t("compare")} backFallback="/progress/photos" compact />
      <Stagger className="flex flex-col gap-5 px-4 pb-8">
        <StaggerItem>
          <SegmentedControl<Mode>
            aria-label={t("compare")}
            value={mode}
            options={[
              { value: "slider", label: t("modes.slider") },
              { value: "sideBySide", label: t("modes.sideBySide") },
            ]}
            onValueChange={setMode}
          />
        </StaggerItem>

        <StaggerItem>
          {mode === "slider" ? (
            <Slider before={left} after={right} />
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <PhotoImage row={left} variant="full" className="aspect-[3/4] w-full rounded-l-[18px]" />
              <PhotoImage row={right} variant="full" className="aspect-[3/4] w-full rounded-r-[18px]" />
            </div>
          )}
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["before", left, leftWeight],
              ["after", right, rightWeight],
            ] as const).map(([side, photo, weight]) => (
              <motion.button
                key={side}
                type="button"
                onClick={() => setPicking(side)}
                aria-label={side === "before" ? t("chooseBefore") : t("chooseAfter")}
                className="flex cursor-pointer flex-col items-start gap-0.5 rounded-[16px] border bg-surface p-3 text-left shadow-card"
                {...PRESS}
              >
                <span className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">{t(side)}</span>
                <span className="text-subhead font-semibold">{fmt.date(photo.taken_at)}</span>
                <span className="text-footnote text-muted-foreground">
                  {[photo.pose ? t(`poses.${photo.pose}`) : null, weight ? fmt.weight(weight) : null].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="pt-1 text-footnote font-medium text-planned">{t("choose")}</span>
              </motion.button>
            ))}
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="flex flex-col gap-1">
            <p className="font-rounded text-title-2">{fmt.between(left.taken_at, right.taken_at)}</p>
            {change !== null ? (
              <p className="text-subhead text-muted-foreground">{t("weightChange", { value: fmt.weightDelta(change) })}</p>
            ) : null}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <ButtonLink href={`/share?transformation=${left.id},${right.id}`} data-nav="forward" size="lg" className="w-full">
            <Share />
            {t("share")}
          </ButtonLink>
        </StaggerItem>
        <p className="px-1 text-footnote text-muted-foreground">{t("privacy")}</p>
      </Stagger>

      <Drawer
        open={picking !== null}
        onOpenChange={(open) => (open ? null : setPicking(null))}
        title={picking === "before" ? t("chooseBefore") : t("chooseAfter")}
        tall
      >
        <div className="grid grid-cols-3 gap-1.5 pb-4">
          {photos.map((photo) => (
            <motion.button
              key={photo.id}
              type="button"
              onClick={() => {
                setChosen((current) => ({ ...current, [picking ?? "after"]: photo.id }));
                setPicking(null);
              }}
              className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-[10px]"
              {...PRESS}
            >
              <PhotoImage row={photo} className="size-full" />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-2 pt-4 pb-1.5 text-left text-caption-2 font-semibold text-white">
                {fmt.shortDate(photo.taken_at)}
              </span>
            </motion.button>
          ))}
        </div>
      </Drawer>
    </>
  );
}

/** "After" underneath, "before" on top clipped at the divider; drag anywhere (or arrow keys). */
function Slider({ before, after }: { before: Media; after: Media }) {
  const t = useTranslations("photos");
  const box = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);

  const move = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div
      ref={box}
      className="relative aspect-[3/4] w-full touch-pan-y overflow-hidden rounded-[18px] bg-surface-2 select-none"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event.clientX);
      }}
    >
      <PhotoImage row={after} variant="full" className="absolute inset-0 size-full" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <PhotoImage row={before} variant="full" className="size-full" />
      </div>
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-caption font-semibold text-white">
        {t("before")}
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-caption font-semibold text-white">
        {t("after")}
      </span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgb(0_0_0/0.4)]" style={{ left: `${position}%` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label={t("divider")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 5));
          if (event.key === "ArrowRight") setPosition((p) => Math.min(100, p + 5));
        }}
        className="absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-float outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ left: `${position}%` }}
      >
        <span aria-hidden className="text-footnote font-bold">‹ ›</span>
      </div>
    </div>
  );
}
