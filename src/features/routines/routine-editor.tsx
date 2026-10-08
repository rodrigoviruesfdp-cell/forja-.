"use client";

import { Activity, CircleCheck, Dumbbell, Ellipsis, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useTranslations } from "use-intl";
import { PRESS } from "@/components/motion/spring";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Group, GroupRow } from "@/components/ui/group";
import { IconButton } from "@/components/ui/icon-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { Stepper } from "@/components/ui/stepper";
import { useSticky } from "@/components/ui/use-sticky";
import { changeScheduleType, setActiveRoutine, updateRoutine } from "@/data/repositories/routines";
import { exerciseDisplayName } from "@/domain/exercises/names";
import {
  LIMITS,
  plannedPerWeek,
  rotationLetter,
  rotationOrder,
  type ScheduleType,
  sportDays,
  toggleWeekday,
  WEEKDAYS,
  weekLayout,
} from "@/domain/routines/builder";
import type { Exercise, Profile, RoutineDay } from "@/domain/schemas";
import { useCatalogNames } from "@/features/exercises/use-exercises";
import { useProfile } from "@/features/profile/use-profile";
import { PageHeader } from "@/features/shell/page-header";
import { useUserData } from "@/features/user-data/user-data-context";
import { DayActionsSheet } from "./day-actions-sheet";
import { DayCard } from "./day-card";
import { DayOrderList } from "./day-order-list";
import { DaySheet, type DaySheetMode } from "./day-sheet";
import { ExercisePicker } from "./exercise-picker";
import { ExerciseSheet } from "./exercise-sheet";
import { RoutineActionsSheet } from "./routine-actions-sheet";
import { useRoutineLabels } from "./use-routine-labels";
import { type RoutineTree, useRoutineTree } from "./use-routines";
import { useWeekdayLabels, WeekdayPicker } from "./weekdays";

/** /routines/edit?id=… */
export function RoutineEditorScreen() {
  const t = useTranslations("routines");
  const id = useSearchParams().get("id");
  const tree = useRoutineTree(id);
  const profile = useProfile();

  if (tree === undefined) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  }
  if (tree === null) {
    return (
      <>
        <PageHeader title={t("title")} backFallback="/routines" />
        <p className="px-4 pt-2 text-muted-foreground">{t("notFound")}</p>
      </>
    );
  }
  return <RoutineEditor tree={tree} profile={profile} />;
}

type Sheet =
  | { type: "exercise"; itemId: string }
  | { type: "picker"; dayId: string }
  | { type: "day"; mode: DaySheetMode }
  | { type: "dayActions"; dayId: string }
  | { type: "routine" };

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-6 items-end justify-between px-4">
      <h2 className="tracking-caption text-footnote font-normal text-muted-foreground uppercase">{children}</h2>
      {action}
    </div>
  );
}

function RoutineEditor({ tree, profile }: { tree: RoutineTree; profile: Profile | undefined }) {
  const t = useTranslations("routines");
  const tx = useTranslations("routines.exercise");
  const common = useTranslations("common");
  const { db } = useUserData();
  const names = useCatalogNames();
  const weekdays = useWeekdayLabels();
  const labels = useRoutineLabels();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [reordering, setReordering] = useState(false);

  const { routine, days, exercises, catalog } = tree;
  const weekly = routine.schedule_type === "weekly";
  const gymOrder = rotationOrder(days);
  const letterOf = new Map(gymOrder.map((day, index) => [day.id, rotationLetter(index)]));
  const planned = plannedPerWeek(routine, days);
  const isActive = profile?.active_routine_id === routine.id;

  const displayName = (exercise: Exercise | undefined) => (exercise ? exerciseDisplayName(exercise, names) : tx("missing"));
  /** "C · Pierna" for rotation days (unless the name already is "Día C"). */
  const dayLabel = (day: RoutineDay) => {
    const letter = letterOf.get(day.id);
    if (weekly || !letter || day.name === t("dayLetter", { letter })) return day.name;
    return `${letter} · ${day.name}`;
  };

  // Each sheet keeps its subject while it slides away.
  const exerciseId = useSticky(sheet?.type === "exercise" ? sheet.itemId : null);
  const pickerDayId = useSticky(sheet?.type === "picker" ? sheet.dayId : null);
  const dayMode = useSticky(sheet?.type === "day" ? sheet.mode : null);
  const actionsDayId = useSticky(sheet?.type === "dayActions" ? sheet.dayId : null);
  const closeSheet = (open: boolean) => {
    if (!open) setSheet(null);
  };

  const allItems = [...exercises.values()].flat();
  const exerciseItem = allItems.find((item) => item.id === exerciseId) ?? null;
  const actionsDay = days.find((day) => day.id === actionsDayId) ?? null;

  function badge(day: RoutineDay) {
    if (day.kind === "sport") {
      return (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-planned/12 text-planned">
          <Activity className="size-5" strokeWidth={2.2} />
        </span>
      );
    }
    const letter = letterOf.get(day.id);
    return weekly || !letter ? (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-foreground">
        <Dumbbell className="size-5" strokeWidth={2.1} />
      </span>
    ) : (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-foreground font-rounded text-title-3 text-background">
        {letter}
      </span>
    );
  }

  function subtitle(day: RoutineDay): string {
    if (day.kind === "sport") {
      if (weekly) return t("kinds.sport");
      return day.weekday === null ? t("noFixedDay") : (weekdays.long[day.weekday] ?? "");
    }
    return t("exerciseCount", { count: exercises.get(day.id)?.length ?? 0 });
  }

  const renderDay = (day: RoutineDay) => (
    <DayCard
      key={day.id}
      day={day}
      badge={badge(day)}
      title={day.name}
      subtitle={subtitle(day)}
      items={exercises.get(day.id) ?? []}
      catalog={catalog}
      displayName={displayName}
      onAddExercise={() => setSheet({ type: "picker", dayId: day.id })}
      onOpenItem={(item) => setSheet({ type: "exercise", itemId: item.id })}
      onActions={() => setSheet({ type: "dayActions", dayId: day.id })}
    />
  );

  const newDay = (kind: RoutineDay["kind"], weekday: (typeof WEEKDAYS)[number] | null) =>
    setSheet({ type: "day", mode: { type: "new", kind, weekday } });

  const layout = weekLayout(days);
  const sports = sportDays(days);

  return (
    <>
      <PageHeader
        title={routine.name}
        subtitle={labels.summary(routine, days)}
        backFallback="/routines"
        actions={
          profile ? (
            <IconButton aria-label={common("more")} onClick={() => setSheet({ type: "routine" })}>
              <Ellipsis strokeWidth={2.4} />
            </IconButton>
          ) : null
        }
      />

      <Stagger className="flex flex-col gap-7 px-4 pb-8">
        <StaggerItem>
          {isActive ? (
            <p className="flex items-center gap-2 px-4 text-subhead text-muted-foreground">
              <CircleCheck className="size-4 shrink-0 text-done" strokeWidth={2.4} />
              <span>
                <span className="font-semibold text-done">{t("active")}</span> · {t("activeHint")}
              </span>
            </p>
          ) : profile ? (
            <Button variant="secondary" className="w-full" onClick={() => void setActiveRoutine(db, profile, routine.id)}>
              <CircleCheck strokeWidth={2.2} />
              {t("setActive")}
            </Button>
          ) : null}
        </StaggerItem>

        <StaggerItem>
          <Group title={t("schedule")} footer={t(`scheduleHints.${routine.schedule_type}`)}>
            <GroupRow className="py-3">
              <SegmentedControl<ScheduleType>
                aria-label={t("schedule")}
                value={routine.schedule_type}
                options={(["rotation", "weekly"] as const).map((value) => ({ value, label: t(`scheduleTypes.${value}`) }))}
                onValueChange={(to) => void changeScheduleType(db, routine, to)}
              />
            </GroupRow>
          </Group>
        </StaggerItem>

        {weekly ? (
          <>
            <StaggerItem className="flex flex-col gap-3">
              {WEEKDAYS.map((weekday) => {
                const list = layout.byWeekday[weekday] ?? [];
                return (
                  <div key={weekday} className="grid grid-cols-[2.25rem_1fr] items-start gap-2.5">
                    <span className="tracking-caption pt-[1.375rem] text-center text-footnote font-semibold text-muted-foreground uppercase">
                      {weekdays.short[weekday]}
                    </span>
                    <div className="flex min-w-0 flex-col gap-2">
                      {list.map(renderDay)}
                      {list.length === 0 ? (
                        <div className="flex h-[4.25rem] items-center justify-between rounded-[22px] bg-surface-2/70 pr-3 pl-4">
                          <span className="text-muted-foreground">{t("rest")}</span>
                          <motion.button
                            type="button"
                            aria-label={`${t("addTraining")}: ${weekdays.long[weekday]}`}
                            onClick={() => newDay("gym", weekday)}
                            {...PRESS}
                            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-surface text-foreground shadow-card"
                          >
                            <Plus className="size-5" strokeWidth={2.4} />
                          </motion.button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </StaggerItem>

            {layout.unassigned.length > 0 ? (
              <StaggerItem className="flex flex-col gap-2">
                <SectionTitle>{t("unassignedTitle")}</SectionTitle>
                {layout.unassigned.map(renderDay)}
                <p className="px-4 text-footnote text-muted-foreground">{t("unassignedFooter")}</p>
              </StaggerItem>
            ) : null}

            <StaggerItem>
              <Button variant="secondary" className="w-full" onClick={() => newDay("gym", 0)}>
                <Plus strokeWidth={2.4} />
                {t("addTraining")}
              </Button>
            </StaggerItem>
          </>
        ) : (
          <>
            <StaggerItem className="flex flex-col gap-2">
              <SectionTitle
                action={
                  gymOrder.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setReordering((on) => !on)}
                      className="cursor-pointer text-subhead font-medium text-planned"
                    >
                      {reordering ? common("done") : t("reorder")}
                    </button>
                  ) : null
                }
              >
                {t("rotationTitle")}
              </SectionTitle>
              {reordering ? <DayOrderList routine={routine} days={gymOrder} /> : gymOrder.map(renderDay)}
              <Button variant="secondary" className="w-full" onClick={() => newDay("gym", null)}>
                <Plus strokeWidth={2.4} />
                {t("addDay")}
              </Button>
              <p className="px-4 text-footnote text-muted-foreground">{t("rotationFooter")}</p>
            </StaggerItem>

            <StaggerItem className="flex flex-col gap-2">
              <SectionTitle>{t("sportsTitle")}</SectionTitle>
              {sports.map(renderDay)}
              <Button variant="secondary" className="w-full" onClick={() => newDay("sport", null)}>
                <Plus strokeWidth={2.4} />
                {t("addSport")}
              </Button>
              <p className="px-4 text-footnote text-muted-foreground">{t("sportsFooter")}</p>
            </StaggerItem>

            <StaggerItem>
              <Group title={t("trainingDaysTitle")} footer={t("trainingDaysFooter")}>
                <GroupRow className="py-3">
                  <WeekdayPicker
                    className="w-full"
                    labels={weekdays}
                    value={routine.training_weekdays as (typeof WEEKDAYS)[number][]}
                    onToggle={(weekday) =>
                      void updateRoutine(db, routine, { training_weekdays: toggleWeekday(routine.training_weekdays, weekday) })
                    }
                  />
                </GroupRow>
              </Group>
            </StaggerItem>
          </>
        )}

        <StaggerItem>
          <Group title={t("weeklyTarget")} footer={t("weeklyTargetFooter", { count: planned })}>
            <GroupRow className="justify-between">
              <span>{t("weeklyTargetLabel")}</span>
              <Stepper
                value={routine.weekly_target ?? Math.max(planned, LIMITS.weeklyTarget.min)}
                min={LIMITS.weeklyTarget.min}
                max={LIMITS.weeklyTarget.max}
                onChange={(value) => void updateRoutine(db, routine, { weekly_target: value })}
                decreaseLabel={tx("decrease", { label: t("weeklyTargetLabel") })}
                increaseLabel={tx("increase", { label: t("weeklyTargetLabel") })}
              />
            </GroupRow>
          </Group>
        </StaggerItem>
      </Stagger>

      <ExerciseSheet
        open={sheet?.type === "exercise"}
        onOpenChange={closeSheet}
        item={exerciseItem}
        name={exerciseItem ? displayName(catalog.get(exerciseItem.exercise_id)) : ""}
        siblings={exerciseItem ? (exercises.get(exerciseItem.routine_day_id) ?? []) : []}
        otherDays={
          exerciseItem
            ? days
                .filter((day) => day.kind === "gym" && day.id !== exerciseItem.routine_day_id)
                .map((day) => ({ day, title: dayLabel(day) }))
            : []
        }
      />
      <ExercisePicker
        open={sheet?.type === "picker"}
        onOpenChange={closeSheet}
        day={days.find((day) => day.id === pickerDayId) ?? null}
      />
      <DaySheet
        open={sheet?.type === "day"}
        onOpenChange={closeSheet}
        routine={routine}
        mode={dayMode}
        defaultGymName={weekly ? t("defaultGymName") : t("dayLetter", { letter: rotationLetter(gymOrder.length) })}
      />
      <DayActionsSheet
        open={sheet?.type === "dayActions"}
        onOpenChange={closeSheet}
        routine={routine}
        day={actionsDay}
        title={actionsDay ? dayLabel(actionsDay) : ""}
        onEdit={() => actionsDay && setSheet({ type: "day", mode: { type: "edit", day: actionsDay } })}
      />
      {profile ? (
        <RoutineActionsSheet open={sheet?.type === "routine"} onOpenChange={closeSheet} routine={routine} profile={profile} />
      ) : null}
    </>
  );
}

