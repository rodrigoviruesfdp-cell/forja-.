"use client";

import { Activity, CalendarCheck, ChevronRight, Dumbbell, MoonStar, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFormatter, useNow, useTranslations } from "use-intl";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardButton, CardLink } from "@/components/ui/card";
import { deleteSession, skipPlannedDay } from "@/data/repositories/sessions";
import { exerciseDisplayName } from "@/domain/exercises/names";
import { rotationLetter, rotationOrder, targetLabel, weekdayOf } from "@/domain/routines/builder";
import { planForDate, weekStrip } from "@/domain/routines/plan";
import { localDate } from "@/domain/dates";
import type { RoutineDay, Session } from "@/domain/schemas";
import { useCatalogNames } from "@/features/exercises/use-exercises";
import { useProfile } from "@/features/profile/use-profile";
import { type RoutineTree, useActiveRoutine } from "@/features/routines/use-routines";
import { useWeekdayLabels, WeekStrip } from "@/features/routines/weekdays";
import { PickDaySheet } from "@/features/session/pick-day-sheet";
import { SessionRow } from "@/features/session/session-row";
import { useActiveSession, useSessionsOn } from "@/features/session/use-session";
import { useStartSession } from "@/features/session/use-start-session";
import { clockText, useTicker } from "@/features/session/use-ticker";
import { PageHeader } from "@/features/shell/page-header";
import { SportSheet, type SportSheetTarget } from "@/features/sports/sport-sheet";
import { useSportName } from "@/features/sports/use-sport-name";
import { useUserData } from "@/features/user-data/user-data-context";

const PREVIEW = 4;

export function TodayScreen() {
  const t = useTranslations("today");
  const tSession = useTranslations("session");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const profile = useProfile();
  const activeRoutine = useActiveRoutine();
  const tree = activeRoutine?.tree;
  const lastGymDayId = activeRoutine?.lastGymDayId;
  const weekdays = useWeekdayLabels();
  const sessionsToday = useSessionsOn(localDate(now));
  const active = useActiveSession();
  const start = useStartSession();
  const common = useTranslations("common");
  const { db, user } = useUserData();
  const [picking, setPicking] = useState(false);
  const [sportSheet, setSportSheet] = useState<SportSheetTarget | null>(null);

  const name = profile?.display_name;
  const profileIncomplete = profile ? !profile.goal || !profile.level : false;
  const date = format.dateTime(now, { weekday: "long", day: "numeric", month: "long" });
  const editorHref = tree ? `/routines/edit?id=${tree.routine.id}` : "/routines";

  // A gym day of the routine already started, done or skipped today uses up today's slot of the rotation.
  const todayIso = localDate(now);
  const today = sessionsToday ?? [];
  const gymDayIds = new Set((tree?.days ?? []).filter((day) => day.kind === "gym").map((day) => day.id));
  const gymDoneToday = today.some((s) => s.routine_day_id !== null && gymDayIds.has(s.routine_day_id));
  const plan = tree ? planForDate(tree.routine, tree.days, now, lastGymDayId ?? null, { gymDoneToday }) : null;
  const touched = new Set(today.map((s) => s.routine_day_id));
  const planned = (plan?.today ?? []).filter((day) => !touched.has(day.id));
  const done = today.filter((s) => s.status === "completed");
  const skipped = today.filter((s) => s.status === "skipped");
  const resting = tree && plan && planned.length === 0 && done.length === 0 && skipped.length === 0 && !active;
  // Nothing to tap until the whole plan is known: a card that shows up and then changes (no
  // routine, day A instead of B) could start the wrong session.
  const loading = activeRoutine === undefined || sessionsToday === undefined || active === undefined;

  async function skip(day: RoutineDay) {
    const undo = await skipPlannedDay(db, user.id, day, todayIso);
    toast(t("skippedToast", { name: day.name }), { action: { label: common("undo"), onClick: () => void undo() } });
  }

  return (
    <>
      <PageHeader subtitle={date} title={name ? t("greeting", { name }) : t("greetingAnonymous")} />
      {loading ? null : (
        <Stagger className="flex flex-col gap-4 px-4 pb-8">
          {active ? (
            <StaggerItem>
              <ActiveCard session={active} />
            </StaggerItem>
          ) : null}

          {done.map((session) => (
            <StaggerItem key={session.id}>
              {session.kind === "gym" ? (
                <CardLink size="tile" href={`/session?id=${session.id}`} data-nav="forward">
                  <SessionRow session={session} label={t("doneTitle")} trailing={<Chevron />} />
                </CardLink>
              ) : (
                <CardButton size="tile" onClick={() => setSportSheet({ mode: "edit", session })}>
                  <SessionRow session={session} label={t("doneTitle")} trailing={<Chevron />} />
                </CardButton>
              )}
            </StaggerItem>
          ))}

          {skipped.map((session) => (
            <StaggerItem key={session.id}>
              <Card size="tile">
                <SessionRow
                  session={session}
                  label={t("skippedTitle")}
                  trailing={
                    <Button variant="ghost" size="sm" className="text-planned" onClick={() => void deleteSession(db, session)}>
                      {common("undo")}
                    </Button>
                  }
                />
              </Card>
            </StaggerItem>
          ))}

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
                <div className="flex w-full flex-col gap-3">
                  <ButtonLink href="/routines" size="lg" className="w-full">
                    {t("createRoutine")}
                  </ButtonLink>
                  {active ? null : (
                    <Button variant="secondary" className="w-full" onClick={() => void start(null, tSession("freeTitle"))}>
                      {tSession("startFree")}
                    </Button>
                  )}
                </div>
              </Card>
            </StaggerItem>
          ) : null}

          {tree
            ? planned.map((day) => (
                <StaggerItem key={day.id}>
                  <PlannedDayCard
                    tree={tree}
                    day={day}
                    href={editorHref}
                    primary={!active}
                    onStart={() =>
                      day.kind === "gym" ? void start(day, day.name) : setSportSheet({ mode: "new", date: todayIso, day })
                    }
                    onSkip={() => void skip(day)}
                  />
                </StaggerItem>
              ))
            : null}

          {resting ? (
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
          ) : null}

          {active ? null : (
            <StaggerItem>
              <div className="-my-1 flex">
                {tree ? (
                  <Button variant="ghost" className="flex-1 text-planned" onClick={() => setPicking(true)}>
                    {tSession("otherDay")}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  className="flex-1 text-planned"
                  onClick={() => setSportSheet({ mode: "new", date: todayIso })}
                >
                  {t("logSport")}
                </Button>
              </div>
            </StaggerItem>
          )}

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
      )}
      <PickDaySheet open={picking} onOpenChange={setPicking} tree={tree ?? null} />
      <SportSheet open={sportSheet !== null} onOpenChange={(open) => !open && setSportSheet(null)} target={sportSheet} />
    </>
  );
}

/** The session in progress: back to it in one tap. */
function ActiveCard({ session }: { session: Session }) {
  const t = useTranslations("today");
  const tSession = useTranslations("session");
  const now = useTicker(1000);
  return (
    <Card size="lg" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-done/15 text-done">
          <Dumbbell className="size-6" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="tracking-caption text-footnote text-muted-foreground uppercase">{t("inProgressTitle")}</p>
          <h2 className="truncate text-title-2">{session.title ?? tSession("title")}</h2>
        </div>
        <span className="numeric text-title-3">{clockText(now - Date.parse(session.started_at ?? session.created_at))}</span>
      </div>
      <ButtonLink href={`/session?id=${session.id}`} data-nav="forward" size="lg" className="w-full">
        {tSession("continue")}
      </ButtonLink>
    </Card>
  );
}

function Chevron() {
  return <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />;
}

/** Hero card for one planned day: what it is, its first exercises and "Start". */
function PlannedDayCard({
  tree,
  day,
  href,
  primary,
  onStart,
  onSkip,
}: {
  tree: RoutineTree;
  day: RoutineDay;
  href: string;
  /** False while another session runs (that one is the main action then). */
  primary: boolean;
  /** Gym: start the session. Sport: log it. */
  onStart: () => void;
  onSkip: () => void;
}) {
  const t = useTranslations("today");
  const tRoutines = useTranslations("routines");
  const tSession = useTranslations("session");
  const sportName = useSportName();
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

      <div className="flex flex-col gap-2">
        <Button size="lg" variant={primary ? "primary" : "secondary"} className="w-full" onClick={onStart}>
          {day.kind === "gym" ? tSession("start") : t("registerSport", { sport: sportName(day.sport) || day.name })}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <ButtonLink href={href} variant="ghost" className="w-full">
            {t("viewRoutine")}
          </ButtonLink>
          <Button variant="ghost" className="w-full" onClick={onSkip}>
            {t("skip")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
