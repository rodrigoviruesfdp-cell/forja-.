"use client";

import { Activity, CalendarCheck, ChevronRight, Dumbbell, MoonStar, UserRound } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "use-intl";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardLink } from "@/components/ui/card";
import { exerciseDisplayName } from "@/domain/exercises/names";
import { rotationLetter, rotationOrder, targetLabel, weekdayOf } from "@/domain/routines/builder";
import { planForDate, weekStrip } from "@/domain/routines/plan";
import type { RoutineDay } from "@/domain/schemas";
import { useCatalogNames } from "@/features/exercises/use-exercises";
import { useProfile } from "@/features/profile/use-profile";
import { type RoutineTree, useLastGymDayId, useRoutineTree } from "@/features/routines/use-routines";
import { useWeekdayLabels, WeekStrip } from "@/features/routines/weekdays";
import { PageHeader } from "@/features/shell/page-header";

const PREVIEW = 4;

export function TodayScreen() {
  const t = useTranslations("today");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const profile = useProfile();
  const tree = useRoutineTree(profile?.active_routine_id ?? null);
  const lastGymDayId = useLastGymDayId(tree?.days);
  const weekdays = useWeekdayLabels();

  const name = profile?.display_name;
  const profileIncomplete = profile ? !profile.goal || !profile.level : false;
  const date = format.dateTime(now, { weekday: "long", day: "numeric", month: "long" });
  const plan = tree ? planForDate(tree.routine, tree.days, now, lastGymDayId ?? null) : null;
  const editorHref = tree ? `/routines/edit?id=${tree.routine.id}` : "/routines";

  return (
    <>
      <PageHeader subtitle={date} title={name ? t("greeting", { name }) : t("greetingAnonymous")} />
      <Stagger className="flex flex-col gap-4 px-4 pb-8">
        {tree === null ? (
          <StaggerItem>
            <Card size="lg" className="flex flex-col items-start gap-4">
              <span className="flex size-12 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
                <Dumbbell className="size-6" strokeWidth={2.1} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-title-2">{t("noRoutineTitle")}</h2>
                <p className="text-muted-foreground">{t("noRoutineBody")}</p>
              </div>
              <ButtonLink href="/routines" size="lg" className="w-full">
                {t("createRoutine")}
              </ButtonLink>
            </Card>
          </StaggerItem>
        ) : null}

        {tree && plan
          ? plan.today.length > 0
            ? plan.today.map((day) => (
                <StaggerItem key={day.id}>
                  <PlannedDayCard tree={tree} day={day} href={editorHref} />
                </StaggerItem>
              ))
            : (
                <StaggerItem>
                  <Card size="lg" className="flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-planned/12 text-planned">
                      <MoonStar className="size-6" strokeWidth={2} />
                    </span>
                    <div>
                      <h2 className="text-title-3">{t("restTitle")}</h2>
                      <p className="text-subhead text-muted-foreground">{t("restBody")}</p>
                    </div>
                  </Card>
                </StaggerItem>
              )
          : null}

        {tree && plan?.upcoming ? (
          <StaggerItem>
            <CardLink size="tile" href={editorHref} className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-concentric bg-surface-2 text-foreground">
                <CalendarCheck className="size-5" strokeWidth={2.1} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="tracking-caption block text-footnote text-muted-foreground uppercase">
                  {t("upcoming")} ·{" "}
                  {t("when", {
                    days: plan.upcoming.inDays,
                    weekday: weekdays.long[(weekdayOf(now) + plan.upcoming.inDays) % 7] ?? "",
                  })}
                </span>
                <span className="block truncate text-headline">{plan.upcoming.day.name}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />
            </CardLink>
          </StaggerItem>
        ) : null}

        {tree ? (
          <StaggerItem>
            <Card className="flex flex-col gap-3">
              <p className="tracking-caption text-footnote text-muted-foreground uppercase">
                {t("thisWeek")} · {tree.routine.name}
              </p>
              <WeekStrip days={weekStrip(tree.routine, tree.days)} labels={weekdays} />
            </Card>
          </StaggerItem>
        ) : null}

        {profileIncomplete ? (
          <StaggerItem>
            <CardLink size="tile" href="/profile" className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-concentric bg-surface-2">
                <UserRound className="size-5" strokeWidth={2.1} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-headline">{t("setupProfile")}</span>
                <span className="block text-subhead text-muted-foreground">{t("setupProfileBody")}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />
            </CardLink>
          </StaggerItem>
        ) : null}
      </Stagger>
    </>
  );
}

/** Hero card for one planned day: what it is and its first exercises with their targets. */
function PlannedDayCard({ tree, day, href }: { tree: RoutineTree; day: RoutineDay; href: string }) {
  const t = useTranslations("today");
  const tRoutines = useTranslations("routines");
  const names = useCatalogNames();
  const items = tree.exercises.get(day.id) ?? [];
  const index = rotationOrder(tree.days).findIndex((d) => d.id === day.id);
  const letter = tree.routine.schedule_type === "rotation" && index >= 0 ? rotationLetter(index) : null;

  return (
    <Card size="lg" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className={
            day.kind === "sport"
              ? "flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-planned/12 text-planned"
              : "flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-foreground font-rounded text-title-2 text-background"
          }
        >
          {day.kind === "sport" ? <Activity className="size-6" strokeWidth={2.1} /> : (letter ?? <Dumbbell className="size-6" />)}
        </span>
        <div className="min-w-0">
          <p className="tracking-caption text-footnote text-muted-foreground uppercase">{t("planTitle")}</p>
          <h2 className="truncate text-title-2">{day.name}</h2>
        </div>
      </div>

      {day.kind === "gym" ? (
        items.length > 0 ? (
          <ul className="flex flex-col">
            {items.slice(0, PREVIEW).map((item) => {
              const exercise = tree.catalog.get(item.exercise_id);
              return (
                <li key={item.id} className="flex items-baseline justify-between gap-3 border-b py-2 last:border-b-0">
                  <span className="truncate">{exercise ? exerciseDisplayName(exercise, names) : tRoutines("exercise.missing")}</span>
                  <span className="numeric shrink-0 text-subhead text-muted-foreground">{targetLabel(item)}</span>
                </li>
              );
            })}
            {items.length > PREVIEW ? (
              <li className="pt-2 text-subhead text-muted-foreground">{t("moreExercises", { count: items.length - PREVIEW })}</li>
            ) : null}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("emptyDay")}</p>
        )
      ) : null}

      <div className="flex flex-col gap-3">
        <ButtonLink href={href} variant="secondary" className="w-full">
          {t("viewRoutine")}
        </ButtonLink>
        <p className="text-center text-footnote text-tertiary-foreground">{t("sessionSoon")}</p>
      </div>
    </Card>
  );
}

