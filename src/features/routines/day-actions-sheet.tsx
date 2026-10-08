"use client";

import { CalendarDays, ChevronLeft, Copy, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { ActionList } from "@/components/ui/action-list";
import { Drawer } from "@/components/ui/drawer";
import { copyDay, deleteDay, restore } from "@/data/repositories/routines";
import { WEEKDAYS } from "@/domain/routines/builder";
import type { Routine, RoutineDay } from "@/domain/schemas";
import { useUserData } from "@/features/user-data/user-data-context";
import { useWeekdayLabels } from "./weekdays";

interface DayActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine: Routine;
  day: RoutineDay | null;
  title: string;
  onEdit: () => void;
}

/** ⋯ menu of a day: edit, duplicate (weekly: pick the weekday) and delete (with undo). */
export function DayActionsSheet({ open, onOpenChange, routine, day, title, onEdit }: DayActionsSheetProps) {
  const t = useTranslations("routines");
  const common = useTranslations("common");
  const weekdays = useWeekdayLabels();
  const { db } = useUserData();
  const [view, setView] = useState<"main" | "duplicate">("main");

  function close() {
    onOpenChange(false);
  }

  async function duplicate(weekday?: (typeof WEEKDAYS)[number]) {
    if (!day) return;
    close();
    await copyDay(db, routine, day, { name: t("copyName", { name: day.name }), weekday });
    toast.success(t("copied"));
  }

  async function remove() {
    if (!day) return;
    close();
    const undo = await deleteDay(db, day);
    toast(t("dayDeleted", { name: day.name }), { action: { label: common("undo"), onClick: () => void restore(db, undo) } });
  }

  const weekly = routine.schedule_type === "weekly";

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setView("main");
      }}
      title={title}
      closeLabel={common("close")}
    >
      {view === "duplicate" ? (
        <div className="flex flex-col gap-3 pt-1">
          <button
            type="button"
            onClick={() => setView("main")}
            className="flex cursor-pointer items-center gap-1 self-start text-planned"
          >
            <ChevronLeft className="size-5" strokeWidth={2.4} />
            {t("duplicateTo")}
          </button>
          <ActionList
            actions={WEEKDAYS.map((weekday) => ({
              key: String(weekday),
              label: weekdays.long[weekday] ?? "",
              Icon: CalendarDays,
              onSelect: () => void duplicate(weekday),
            }))}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-1">
          <ActionList
            actions={[
              {
                key: "edit",
                label: common("edit"),
                Icon: Pencil,
                onSelect: () => {
                  close();
                  onEdit();
                },
              },
              {
                key: "duplicate",
                label: weekly ? t("duplicateTo") : t("duplicate"),
                Icon: Copy,
                onSelect: () => (weekly ? setView("duplicate") : void duplicate()),
              },
            ]}
          />
          <ActionList
            actions={[{ key: "delete", label: t("deleteDay"), Icon: Trash2, destructive: true, onSelect: () => void remove() }]}
          />
        </div>
      )}
    </Drawer>
  );
}
