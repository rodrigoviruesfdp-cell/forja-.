"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { TextRow } from "@/components/ui/form-rows";
import { Group, GroupRow } from "@/components/ui/group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { addDay, updateDay } from "@/data/repositories/routines";
import type { DayKind, Weekday } from "@/domain/routines/builder";
import type { Routine, RoutineDay } from "@/domain/schemas";
import { useUserData } from "@/features/user-data/user-data-context";
import { useWeekdayLabels, WeekdayPicker } from "./weekdays";

const SPORT_KEYS = [
  "football",
  "padel",
  "running",
  "cycling",
  "swimming",
  "basketball",
  "tennis",
  "climbing",
  "yoga",
  "boxing",
  "hiking",
] as const;

export type DaySheetMode =
  | { type: "new"; kind: DayKind; weekday: Weekday | null }
  | { type: "edit"; day: RoutineDay };

interface DaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine: Routine;
  mode: DaySheetMode | null;
  /** Name used when the field is left empty ("Día C", "Entreno"). */
  defaultGymName: string;
}

/** Create or edit a day: gym or sport, its name and (when it applies) its weekday. */
export function DaySheet({ open, onOpenChange, routine, mode, defaultGymName }: DaySheetProps) {
  const t = useTranslations("routines");
  const common = useTranslations("common");
  const title = mode?.type === "edit" ? t("editDayTitle") : t("newDayTitle");
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={title} closeLabel={common("cancel")}>
      {mode ? (
        <DayForm
          key={mode.type === "edit" ? mode.day.id : `new-${mode.kind}-${mode.weekday}`}
          routine={routine}
          mode={mode}
          defaultGymName={defaultGymName}
          close={() => onOpenChange(false)}
        />
      ) : null}
    </Drawer>
  );
}

function DayForm({
  routine,
  mode,
  defaultGymName,
  close,
}: {
  routine: Routine;
  mode: DaySheetMode;
  defaultGymName: string;
  close: () => void;
}) {
  const t = useTranslations("routines");
  const common = useTranslations("common");
  const weekdays = useWeekdayLabels();
  const { db } = useUserData();
  const existing = mode.type === "edit" ? mode.day : null;

  const [kind, setKind] = useState<DayKind>(existing?.kind ?? (mode.type === "new" ? mode.kind : "gym"));
  const [name, setName] = useState(existing?.kind === "gym" ? existing.name : "");
  const [sport, setSport] = useState(existing?.sport ?? "");
  const weekly = routine.schedule_type === "weekly";
  const initialWeekday = (existing ? existing.weekday : mode.type === "new" ? mode.weekday : null) as Weekday | null;
  const [weekday, setWeekday] = useState<Weekday | null>(initialWeekday ?? (weekly ? 0 : null));
  const [busy, setBusy] = useState(false);

  const showWeekday = weekly || kind === "sport";
  const canSave = kind === "gym" || sport.trim() !== "";

  async function save() {
    if (!canSave || busy) return;
    setBusy(true);
    const dayName = kind === "sport" ? sport : name || existing?.name || defaultGymName;
    if (existing) await updateDay(db, routine, existing, { name: dayName, sport, weekday: showWeekday ? weekday : null });
    else await addDay(db, routine, { kind, name: dayName, sport, weekday: showWeekday ? weekday : null });
    close();
  }

  return (
    <div className="flex flex-col gap-6 pt-1 pb-2">
      {existing ? null : (
        <Group>
          <GroupRow className="py-3">
            <SegmentedControl<DayKind>
              aria-label={t("kinds.gym")}
              value={kind}
              options={(["gym", "sport"] as const).map((value) => ({ value, label: t(`kinds.${value}`) }))}
              onValueChange={setKind}
            />
          </GroupRow>
        </Group>
      )}

      {kind === "gym" ? (
        <Group title={t("dayName")}>
          <TextRow
            aria-label={t("dayName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={existing ? existing.name : `${defaultGymName} · ${t("dayNamePlaceholder")}`}
            maxLength={60}
            enterKeyHint="done"
          />
        </Group>
      ) : (
        <Group title={t("sport")}>
          <TextRow
            aria-label={t("sport")}
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            placeholder={t("sportPlaceholder")}
            maxLength={60}
            enterKeyHint="done"
          />
          <GroupRow className="flex-wrap gap-2 py-3">
            {SPORT_KEYS.map((key) => {
              const label = t(`sports.${key}`);
              return (
                <Chip
                  key={key}
                  className="h-9 px-3.5 text-footnote"
                  active={sport === label}
                  aria-pressed={sport === label}
                  onClick={() => setSport(label)}
                >
                  {label}
                </Chip>
              );
            })}
          </GroupRow>
        </Group>
      )}

      {showWeekday ? (
        <Group title={t("weekday")} footer={weekly ? undefined : weekday === null ? t("noFixedDay") : weekdays.long[weekday]}>
          <GroupRow className="py-3">
            <WeekdayPicker
              className="w-full"
              labels={weekdays}
              value={weekday === null ? [] : [weekday]}
              // Weekly days always need one; a sport in a rotation can go without (tap again to clear).
              onToggle={(wd) => setWeekday(wd === weekday && !weekly ? null : wd)}
            />
          </GroupRow>
        </Group>
      ) : null}

      <Button size="lg" className="w-full" disabled={!canSave || busy} onClick={() => void save()}>
        {existing ? common("save") : kind === "sport" ? t("addSport") : t("addDay")}
      </Button>
    </div>
  );
}
