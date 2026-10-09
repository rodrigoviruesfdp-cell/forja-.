"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { Group, GroupRow } from "@/components/ui/group";
import { TextRow } from "@/components/ui/form-rows";
import type { ProcessedPhoto } from "@/data/media/process";
import { addProgressPhoto, updateProgressPhoto } from "@/data/repositories/photos";
import { dateOf, localDate } from "@/domain/dates";
import { type Media, type Pose, POSES } from "@/domain/schemas";
import { fromKg, parseDecimal, roundTo, toKg } from "@/domain/units";
import { usePrefs } from "@/features/preferences/prefs";
import { useUserData } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";
import { PhotoImage } from "./photo-image";
import { useWeightsOn } from "./use-photos";

export type PhotoSheetTarget =
  | { mode: "new"; photo: ProcessedPhoto; previewUrl: string }
  | { mode: "edit"; row: Media };

interface PhotoSheetProps {
  target: PhotoSheetTarget | null;
  onOpenChange: (open: boolean) => void;
}

/** New photo (after picking it) or editing one: the day, the pose and that day's body weight. */
export function PhotoSheet({ target, onOpenChange }: PhotoSheetProps) {
  const t = useTranslations("photos");
  return (
    <Drawer open={target !== null} onOpenChange={onOpenChange} title={target?.mode === "edit" ? t("editTitle") : t("newTitle")}>
      {target ? <PhotoForm key={target.mode === "edit" ? target.row.id : target.previewUrl} target={target} close={() => onOpenChange(false)} /> : null}
    </Drawer>
  );
}

function PhotoForm({ target, close }: { target: PhotoSheetTarget; close: () => void }) {
  const t = useTranslations("photos");
  const format = useFormatter();
  const { db, user } = useUserData();
  const { units } = usePrefs();
  const today = localDate(new Date());
  const editing = target.mode === "edit" ? target.row : null;
  const [date, setDate] = useState(editing?.taken_at ?? today);
  const [pose, setPose] = useState<Pose | null>(editing ? editing.pose : "front");
  const known = useWeightsOn(editing ? [editing.taken_at] : []).get(editing?.taken_at ?? "");
  const [weight, setWeight] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const weightText = weight ?? (known ? format.number(roundTo(fromKg(known, units), 1)) : "");

  async function save() {
    if (busy) return;
    setBusy(true);
    const typed = parseDecimal(weightText);
    const weightKg = typed !== null && typed > 0 ? roundTo(toKg(typed, units), 2) : null;
    if (target.mode === "new") {
      await addProgressPhoto(db, user.id, { ...target.photo, takenAt: date, pose, weightKg });
      toast.success(t("saved"));
    } else {
      await updateProgressPhoto(db, user.id, target.row, { takenAt: date, pose, weightKg });
    }
    setBusy(false);
    close();
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="mx-auto aspect-[3/4] h-56 overflow-hidden rounded-[18px] bg-surface-2 shadow-card">
        {target.mode === "new" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={target.previewUrl} alt={t("newTitle")} className="size-full object-cover" />
        ) : (
          <PhotoImage row={target.row} className="size-full" />
        )}
      </div>

      <Group>
        <TextRow
          id="photo-date"
          label={t("date")}
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label={`${t("date")}: ${format.dateTime(dateOf(date), { day: "numeric", month: "long", year: "numeric" })}`}
        />
        <GroupRow className="flex-col items-start gap-2 py-3">
          <span>{t("pose")}</span>
          <div role="radiogroup" aria-label={t("pose")} className="flex flex-wrap gap-2">
            {[...POSES, null].map((value) => (
              <Chip
                key={value ?? "none"}
                role="radio"
                aria-checked={pose === value}
                active={pose === value}
                className="h-9 px-3.5 text-footnote"
                onClick={() => setPose(value)}
              >
                {value ? t(`poses.${value}`) : t("noPose")}
              </Chip>
            ))}
          </div>
        </GroupRow>
        <TextRow
          id="photo-weight"
          label={`${t("weight")} (${units})`}
          inputMode="decimal"
          value={weightText}
          onChange={(e) => setWeight(e.target.value.slice(0, 6))}
          placeholder={t("weightPlaceholder")}
          enterKeyHint="done"
        />
      </Group>

      <p className={cn("px-1 text-footnote text-muted-foreground")}>{t("privacy")}</p>

      <Button size="lg" className="w-full" disabled={busy} onClick={() => void save()}>
        {t("save")}
      </Button>
    </div>
  );
}
