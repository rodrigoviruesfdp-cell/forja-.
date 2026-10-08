/**
 * The monthly calendar: the grid of days, what the active routine plans for the days still
 * ahead, and how each day went. Past days show only what you logged: plans are never
 * stored, they are worked out from the routine (see plan.ts).
 */
import { addDays, dateOf, localDate, weekdayOfIso } from "./dates";
import { type Weekday, WEEKDAYS } from "./routines/builder";
import { nextRotationDay } from "./routines/plan";
import type { Routine, RoutineDay, Session } from "./schemas";

export interface CalendarCell {
  /** yyyy-mm-dd */
  date: string;
  day: number;
  /** False for the days of the previous / next month that fill the first and last week. */
  inMonth: boolean;
}

/** The weeks (Monday first) that cover a month; `month` is 0–11. */
export function monthGrid(year: number, month: number): CalendarCell[][] {
  const first = localDate(new Date(year, month, 1, 12));
  const last = localDate(new Date(year, month + 1, 0, 12));
  const weeks: CalendarCell[][] = [];
  let cursor = addDays(first, -weekdayOfIso(first));
  while (cursor <= last) {
    weeks.push(
      WEEKDAYS.map((offset) => {
        const date = addDays(cursor, offset);
        const day = dateOf(date);
        return { date, day: day.getDate(), inMonth: day.getMonth() === month };
      }),
    );
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

const gymFirst = (a: RoutineDay, b: RoutineDay) => (a.kind === b.kind ? a.position - b.position : a.kind === "gym" ? -1 : 1);

/**
 * What the routine plans from `today` to `to` (both included), day by day.
 * Weekly: each day on its weekday. Rotation: the next gym days in order, one per training
 * weekday (all days count if none are set), plus sports pinned to a weekday.
 * `gymUsedToday`: a gym day was already started, done or skipped today.
 */
export function projectPlan(
  routine: Routine,
  days: readonly RoutineDay[],
  today: string,
  to: string,
  lastGymDayId: string | null,
  gymUsedToday = false,
): Map<string, RoutineDay[]> {
  const plan = new Map<string, RoutineDay[]>();
  const on = (weekday: Weekday) => days.filter((day) => day.weekday === weekday);
  let next = nextRotationDay(days, lastGymDayId);
  const trains = (weekday: Weekday) => routine.training_weekdays.length === 0 || routine.training_weekdays.includes(weekday);

  for (let date = today; date <= to; date = addDays(date, 1)) {
    const weekday = weekdayOfIso(date);
    let planned: RoutineDay[];
    if (routine.schedule_type === "weekly") {
      planned = on(weekday);
    } else {
      planned = on(weekday).filter((day) => day.kind === "sport");
      const slotFree = !(date === today && gymUsedToday);
      if (next && trains(weekday) && slotFree) {
        planned.push(next);
        next = nextRotationDay(days, next.id);
      }
    }
    if (planned.length > 0) plan.set(date, planned.sort(gymFirst));
  }
  return plan;
}

export interface DayMarks {
  /** Sessions done that day. */
  completed: number;
  inProgress: boolean;
  /** Something planned was skipped (and nothing was done instead). */
  skipped: boolean;
  /** Planned days still to do (today and later only). */
  planned: number;
}

/** How a day went: done, in progress, skipped, still planned, or a rest day (all zero/false). */
export function dayMarks(sessions: readonly Session[], planned: readonly RoutineDay[]): DayMarks {
  const live = sessions.filter((session) => !session.deleted_at);
  const touched = new Set(live.map((session) => session.routine_day_id));
  const completed = live.filter((session) => session.status === "completed").length;
  return {
    completed,
    inProgress: live.some((session) => session.status === "in_progress"),
    skipped: completed === 0 && live.some((session) => session.status === "skipped"),
    planned: planned.filter((day) => !touched.has(day.id)).length,
  };
}
