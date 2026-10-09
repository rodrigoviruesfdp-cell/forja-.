"use client";

import { ChevronLeft, ChevronRight, Columns2, Pencil, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useConfirm } from "@/components/ui/confirm";
import { deleteProgressPhoto } from "@/data/repositories/photos";
import type { Media } from "@/domain/schemas";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useUserData } from "@/features/user-data/user-data-context";
import { PhotoImage } from "./photo-image";
import { usePhotoFormat, useWeightsOn } from "./use-photos";

interface PhotoViewerProps {
  photos: Media[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onEdit: (row: Media) => void;
}

/** A photo full screen on black: swipe or the arrows for the next one; edit, compare or delete. */
export function PhotoViewer({ photos, index, onIndexChange, onClose, onEdit }: PhotoViewerProps) {
  const t = useTranslations("photos");
  const common = useTranslations("common");
  const fmt = usePhotoFormat();
  const confirm = useConfirm();
  const router = useRouter();
  const { db } = useUserData();
  const row = photos[index];
  const weight = useWeightsOn(row ? [row.taken_at] : []).get(row?.taken_at ?? "");

  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < photos.length) onIndexChange(next);
  };
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (!row || typeof document === "undefined") return null;

  async function remove() {
    if (!row) return;
    const ok = await confirm({
      title: t("deleteTitle"),
      message: t("deleteMessage"),
      confirmLabel: t("delete"),
      cancelLabel: common("cancel"),
      destructive: true,
    });
    if (!ok) return;
    await deleteProgressPhoto(db, row);
    toast(t("deleted"));
    if (photos.length <= 1) onClose();
    else onIndexChange(Math.min(index, photos.length - 2));
  }

  const action = "flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/12 text-white";

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal
      aria-label={t("photoAlt", { date: fmt.date(row.taken_at) })}
      className="fixed inset-0 z-[60] mx-auto flex max-w-lg flex-col bg-black text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between gap-3 px-3 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <div className="min-w-0 pl-1">
          <p className="truncate text-headline">{fmt.date(row.taken_at)}</p>
          <p className="text-footnote text-white/60">
            {[row.pose ? t(`poses.${row.pose}`) : null, weight ? fmt.weight(weight) : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button type="button" aria-label={t("close")} onClick={onClose} className={action}>
          <X className="size-5" strokeWidth={2.4} />
        </button>
      </div>

      <motion.div
        key={row.id}
        className="relative min-h-0 flex-1 touch-pan-y"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) go(1);
          else if (info.offset.x > 60) go(-1);
        }}
      >
        <PhotoImage row={row} variant="full" fit="contain" className="size-full" />
      </motion.div>

      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="flex gap-2">
          <button type="button" aria-label={t("previous")} disabled={index === 0} onClick={() => go(-1)} className={`${action} disabled:opacity-30`}>
            <ChevronLeft className="size-5" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            aria-label={t("next")}
            disabled={index === photos.length - 1}
            onClick={() => go(1)}
            className={`${action} disabled:opacity-30`}
          >
            <ChevronRight className="size-5" strokeWidth={2.4} />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={t("compare")}
            onClick={() => {
              setNavDirection("forward");
              router.push(`/progress/photos/compare?after=${row.id}`);
            }}
            className={action}
          >
            <Columns2 className="size-5" strokeWidth={2.2} />
          </button>
          <button type="button" aria-label={t("edit")} onClick={() => onEdit(row)} className={action}>
            <Pencil className="size-5" strokeWidth={2.2} />
          </button>
          <button type="button" aria-label={t("delete")} onClick={() => void remove()} className={`${action} text-[#ff453a]`}>
            <Trash2 className="size-5" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </motion.div>,
    document.body,
  );
}
