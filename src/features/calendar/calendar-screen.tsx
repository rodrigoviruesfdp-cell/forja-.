"use client";

import { Activity, Check, ChevronLeft, ChevronRight, Dumbbell, Flame, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useFormatter, useNow, useTranslations } from "use-intl";
import { SPRING } from "@/components/motion/spring";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { deleteSession } from "@/data/repositories/sessions";
import { type CalendarCell, type DayMarks, dayMarks, monthGrid, projectPlan } from "@/domain/calendar";
import { dateOf, localDate } from "@/domain/dates";
import type { RoutineDay, Session } from "@/domain/schemas";
import { weeklyStreak, weeklyTarget } from "@/domain/streak";
import { useActiveRoutine } from "@/features/routines/use-routines";
import { useWeekdayLabels } from "@/features/routines/weekdays";
import { SessionRow } from "@/features/session/session-row";
import { useSessionDays, useSessionsBetween } from "@/features/session/use-session";
import { useStartSession } from "@/features/session/use-start-session";
import { PageHeader } from "@/features/shell/page-header";
import { SportSheet, type SportSheetTarget } from "@/features/sports/sport-sheet";
import { useSportName } from "@/features/sports/use-sport-name";
import { useUserData } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";

interface MonthView {
  year: number;
  month: number;
}

const EMPTY: Session[] = [];

/**
 * The month at a glance: what you did (green), skipped (grey) and what the active routine
 * plans for the days ahead (blue); your weekly streak on top; tap a day to see it.
 */
export function CalendarScreen() {
  const t = useTranslations("calendar");
  const now = useNow({ updateInterval: 60_000 });
  const today = localDate(now);
  const activeRoutine = useActiveRoutine();
  const tree = activeRoutine?.tree;
  const lastGymDayId = activeRoutine?.lastGymDayId;
  const [view, setView] = useState<MonthView>({ year: now.getFullYear(), month: now.getMonth() });
  const [direction, setDirection] = useState(0);
  const [selected, setSelected] = useState(today);
  const [sheet, setSheet] = useState<SportSheetTarget | null>(null);

  const weeks = monthGrid(view.year, view.month);
  const from = weeks[0]?.[0]?.date ?? today;
  const to = weeks.at(-1)?.at(-1)?.date ?? today;
  const sessions = useSessionsBetween(from < today ? from : today, to > today ? to : today) ?? EMPTY;
  const days = useSessionDays();

  const byDate = new Map<string, Session[]>();
  for (const session of sessions) byDate.set(session.date, [...(byDate.get(session.date) ?? []), session]);
  const gymDayIds = new Set((tree?.days ?? []).filter((d) => d.kind === "gym").map((d) => d.id));
  const gymUsedToday = (byDate.get(today) ?? []).some((s) => s.routine_day_id !== null && gymDayIds.has(s.routine_day_id));
  const plan =
    tree && to >= today
      ? projectPlan(tree.routine, tree.days, today, to, lastGymDayId ?? null, gymUsedToday)
      : new Map<string, RoutineDay[]>();
  const streak = days ? weeklyStreak(days, weeklyTarget(tree?.routine ?? null, tree?.days ?? []), today) : null;

  function go(offset: number) {
    setDirection(offset);
    setView(({ year, month }) => {
      const date = new Date(year, month + offset, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function goToday() {
    setDirection(0);
    setView({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(today);
  }

  const isCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();

  return (
    <>
      <PageHeader title={t("title")} />
      <Stagger className="flex flex-col gap-4 px-4 pb-8">
        {streak ? (
          <StaggerItem>
            <StreakCard current={streak.current} best={streak.best} done={streak.thisWeek.done} target={streak.thisWeek.target} />
          </StaggerItem>
        ) : null}

        <StaggerItem>
          <MonthCard
            view={view}
            weeks={weeks}
            direction={direction}
            today={today}
            selected={selected}
            marksOf={(date) => dayMarks(byDate.get(date) ?? EMPTY, date >= today ? (plan.get(date) ?? []) : [])}
            onSelect={setSelected}
            onMove={go}
            onToday={isCurrentMonth && selected === today ? null : goToday}
          />
        </StaggerItem>

        <StaggerItem>
          <DayDetail
            key={selected}
            date={selected}
            today={today}
            sessions={byDate.get(selected) ?? EMPTY}
            planned={selected >= today ? (plan.get(selected) ?? []) : []}
            onSport={(target) => setSheet(target)}
          />
        </StaggerItem>
      </Stagger>
      <SportSheet open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)} target={sheet} />
    </>
  );
}

/** Streak in weeks, with this week's progress as a ring (like the Fitness rings). */
function StreakCard({ current, best, done, target }: { current: number; best: number; done: number; target: number }) {
  const t = useTranslations("calendar");
  const progress = Math.min(1, done / target);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-streak/15 text-streak">
          <Flame className="size-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="tracking-caption text-footnote text-muted-foreground uppercase">{t("streak")}</p>
          <p className="numeric text-title-2">{t("streakWeeks", { count: current })}</p>
          {best > current ? <p className="text-footnote text-muted-foreground">{t("streakBest", { count: best })}</p> : null}
        </div>
        <div className="relative size-14 shrink-0" role="img" aria-label={t("thisWeek", { done, target })}>
          <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
            <circle cx="28" cy="28" r="23" fill="none" strokeWidth="7" className="stroke-streak/20" />
            <motion.circle
              cx="28"
              cy="28"
              r="23"
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              className="stroke-streak"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress }}
            />
          </svg>
          <span className="numeric absolute inset-0 flex items-center justify-center text-subhead font-semibold">
            {done >= target ? <Check className="size-5 text-streak" strokeWidth={3} /> : `${done}/${target}`}
          </span>
        </div>
      </div>
      <p className="text-footnote text-muted-foreground">{t("streakHint")}</p>
    </Card>
  );
}

function MonthCard({
  view,
  weeks,
  direction,
  today,
  selected,
  marksOf,
  onSelect,
  onMove,
  onToday,
}: {
  view: MonthView;
  weeks: CalendarCell[][];
  direction: number;
  today: string;
  selected: string;
  marksOf: (date: string) => DayMarks;
  onSelect: (date: string) => void;
  onMove: (offset: number) => void;
  onToday: (() => void) | null;
}) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const weekdays = useWeekdayLabels();
  const title = format.dateTime(new Date(view.year, view.month, 1), { month: "long", year: "numeric" });

  return (
    <Card className="flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-title-3 first-letter:uppercase">{title}</h2>
        {onToday ? (
          <button type="button" onClick={onToday} className="h-11 cursor-pointer px-2 text-subhead font-semibold text-planned">
            {t("today")}
          </button>
        ) : null}
        <IconButton aria-label={t("previous")} onClick={() => onMove(-1)}>
          <ChevronLeft />
        </IconButton>
        <IconButton aria-label={t("next")} onClick={() => onMove(1)}>
          <ChevronRight />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 text-center">
        {weekdays.narrow.map((label, i) => (
          <span key={i} aria-hidden className="text-caption font-semibold text-muted-foreground">
            {label}
          </span>
        ))}
      </div>

      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={`${view.year}-${view.month}`}
          custom={direction}
          initial={{ x: direction * 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction * -60, opacity: 0 }}
          transition={SPRING}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) onMove(1);
            else if (info.offset.x > 50) onMove(-1);
          }}
          className="flex touch-pan-y flex-col gap-1"
          role="grid"
        >
          {weeks.map((week) => (
            <div key={week[0]?.date} role="row" className="grid grid-cols-7">
              {week.map((cell) => (
                <DayCell
                  key={cell.date}
                  cell={cell}
                  isToday={cell.date === today}
                  selected={cell.date === selected}
                  marks={marksOf(cell.date)}
                  onSelect={() => onSelect(cell.date)}
                />
              ))}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 border-t pt-3 text-caption text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-done" />
          {t("legendDone")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full border-[1.5px] border-planned" />
          {t("legendPlanned")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-2.5 rounded-full bg-tertiary-foreground" />
          {t("legendSkipped")}
        </span>
      </div>
    </Card>
  );
}

function DayCell({
  cell,
  isToday,
  selected,
  marks,
  onSelect,
}: {
  cell: CalendarCell;
  isToday: boolean;
  selected: boolean;
  marks: DayMarks;
  onSelect: () => void;
}) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const status = marks.inProgress
    ? t("status.inProgress")
    : marks.completed > 0
      ? t("status.done")
      : marks.skipped
        ? t("status.skipped")
        : marks.planned > 0
          ? t("status.planned")
          : t("status.rest");
  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={selected}
      aria-label={t("dayLabel", { date: format.dateTime(dateOf(cell.date), { weekday: "long", day: "numeric", month: "long" }), status })}
      onClick={onSelect}
      className="flex h-[52px] cursor-pointer flex-col items-center justify-center gap-1"
    >
      <span
        className={cn(
          "numeric flex size-9 items-center justify-center rounded-full text-callout",
          selected
            ? "bg-foreground font-semibold text-background"
            : isToday
              ? "font-semibold text-planned"
              : cell.inMonth
                ? "text-foreground"
                : "text-tertiary-foreground",
        )}
      >
        {cell.day}
      </span>
      <span aria-hidden className={cn("flex h-1.5 items-center gap-[3px]", !cell.inMonth && "opacity-50")}>
        {Array.from({ length: Math.min(3, marks.completed) }, (_, i) => (
          <span key={`c${i}`} className="size-1.5 rounded-full bg-done" />
        ))}
        {marks.inProgress ? <span className="size-1.5 rounded-full border-[1.5px] border-done" /> : null}
        {marks.skipped ? <span className="h-[3px] w-2.5 rounded-full bg-tertiary-foreground" /> : null}
        {Array.from({ length: Math.min(3 - Math.min(3, marks.completed), marks.planned) }, (_, i) => (
          <span key={`p${i}`} className="size-1.5 rounded-full border-[1.5px] border-planned" />
        ))}
      </span>
    </button>
  );
}

/** The selected day: what you did (tap to open it), what is planned, and "Add a sport". */
function DayDetail({
  date,
  today,
  sessions,
  planned,
  onSport,
}: {
  date: string;
  today: string;
  sessions: Session[];
  planned: RoutineDay[];
  onSport: (target: SportSheetTarget) => void;
}) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const start = useStartSession();
  const sportName = useSportName();
  const { db } = useUserData();
  const touched = new Set(sessions.map((s) => s.routine_day_id));
  const pending = planned.filter((day) => !touched.has(day.id));
  const ordered = [...sessions].sort((a, b) => (a.started_at ?? a.created_at).localeCompare(b.started_at ?? b.created_at));
  const label = format.dateTime(dateOf(date), { weekday: "long", day: "numeric", month: "long" });
  const empty = ordered.length === 0 && pending.length === 0;

  return (
    <section className="flex flex-col gap-2" aria-live="polite">
      <h2 className="tracking-caption px-1 text-footnote text-muted-foreground uppercase">
        {date === today ? `${t("today")} · ${label}` : label}
      </h2>
      {empty ? (
        <Card className="text-center text-subhead text-muted-foreground">{date > today ? t("rest") : t("nothingLogged")}</Card>
      ) : (
        <div className="overflow-hidden rounded-[22px] border bg-surface shadow-card [--outer-p:12px] [--outer-r:22px]">
          {ordered.map((session) => (
            <div key={session.id} className="relative px-3 py-2.5 after:absolute after:right-0 after:bottom-0 after:left-16 after:h-px after:scale-y-50 after:bg-separator last:after:hidden">
              <SessionRow
                session={session}
                label={session.status === "in_progress" ? t("inProgress") : session.status === "skipped" ? t("skipped") : undefined}
                href={session.kind === "gym" && session.status !== "skipped" ? `/session?id=${session.id}` : undefined}
                onSelect={session.kind === "sport" && session.status === "completed" ? () => onSport({ mode: "edit", session }) : undefined}
                trailing={
                  session.status === "skipped" ? (
                    <button
                      type="button"
                      aria-label={t("unskipLabel", { name: session.title ?? "" })}
                      onClick={() => void deleteSession(db, session)}
                      className="h-11 shrink-0 cursor-pointer px-2 text-subhead font-semibold text-planned"
                    >
                      {t("unskip")}
                    </button>
                  ) : undefined
                }
              />
            </div>
          ))}
          {pending.map((day) => (
            <div key={day.id} className="relative flex items-center gap-3 px-3 py-2.5 after:absolute after:right-0 after:bottom-0 after:left-16 after:h-px after:scale-y-50 after:bg-separator last:after:hidden">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-concentric border-[1.5px] border-dashed border-planned text-planned">
                {day.kind === "gym" ? <Dumbbell className="size-5" strokeWidth={2.1} /> : <Activity className="size-5" strokeWidth={2.1} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="tracking-caption block text-footnote text-muted-foreground uppercase">{t("planned")}</span>
                <span className="block truncate text-headline">{day.kind === "sport" ? day.name || sportName(day.sport) : day.name}</span>
              </span>
              {date === today ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="relative touch-target h-9 px-3.5"
                  onClick={() => (day.kind === "gym" ? void start(day, day.name) : onSport({ mode: "new", date, day }))}
                >
                  {day.kind === "gym" ? t("start") : t("register")}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {date <= today ? (
        <Button variant="secondary" className="w-full" onClick={() => onSport({ mode: "new", date })}>
          <Plus />
          {t("addSport")}
        </Button>
      ) : null}
    </section>
  );
}
