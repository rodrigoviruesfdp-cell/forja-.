/**
 * What a routine plans for a given day. Planned sessions are not stored: they are worked
 * out from the active routine (and, for rotations, from the last gym day you completed).
 */
import type { Routine, RoutineDay } from "../schemas";
import { byPosition, rotationOrder, type Weekday, WEEKDAYS, weekdayOf } from "./builder";

export interface Upcoming {
  day: RoutineDay;
  /** 1 = tomorrow. */
  inDays: number;
}

export interface DayPlan {
  /** Planned for the date: gym first, then sports. Empty = rest day. */
  today: RoutineDay[];
  /** The next session after today. */
  upcoming: Upcoming | null;
}

const gymFirst = (a: RoutineDay, b: RoutineDay) => (a.kind === b.kind ? byPosition(a, b) : a.kind === "gym" ? -1 : 1);

function shift(weekday: Weekday, offset: number): Weekday {
  return ((weekday + offset) % 7) as Weekday;
}

/** Rotation: the gym day after the last one you completed (the first one if none). */
export function nextRotationDay(days: readonly RoutineDay[], lastGymDayId: string | null): RoutineDay | null {
  const order = rotationOrder(days);
  if (order.length === 0) return null;
  const index = lastGymDayId ? order.findIndex((day) => day.id === lastGymDayId) : -1;
  return order[(index + 1) % order.length] ?? null;
}

function isTrainingWeekday(routine: Routine, weekday: Weekday): boolean {
  return routine.training_weekdays.length === 0 || routine.training_weekdays.includes(weekday);
}

export function planForDate(
  routine: Routine,
  days: readonly RoutineDay[],
  date: Date,
  lastGymDayId: string | null = null,
): DayPlan {
  const weekday = weekdayOf(date);

  if (routine.schedule_type === "weekly") {
    const on = (wd: Weekday) => days.filter((day) => day.weekday === wd).sort(gymFirst);
    let upcoming: Upcoming | null = null;
    for (let offset = 1; offset <= 7 && !upcoming; offset += 1) {
      const first = on(shift(weekday, offset))[0];
      if (first) upcoming = { day: first, inDays: offset };
    }
    return { today: on(weekday), upcoming };
  }

  const pinnedSports = (wd: Weekday) =>
    days.filter((day) => day.kind === "sport" && day.weekday === wd).sort(byPosition);
  const next = nextRotationDay(days, lastGymDayId);
  const gymToday = next !== null && isTrainingWeekday(routine, weekday);
  const today = [...(gymToday && next ? [next] : []), ...pinnedSports(weekday)];

  // After today: the following gym day on the next training weekday, or a pinned sport if sooner.
  const gymAfter = gymToday && next ? nextRotationDay(days, next.id) : next;
  let upcoming: Upcoming | null = null;
  for (let offset = 1; offset <= 7 && !upcoming; offset += 1) {
    const wd = shift(weekday, offset);
    if (gymAfter && isTrainingWeekday(routine, wd)) upcoming = { day: gymAfter, inDays: offset };
    else if (pinnedSports(wd)[0]) upcoming = { day: pinnedSports(wd)[0] as RoutineDay, inDays: offset };
  }
  return { today, upcoming };
}

export interface WeekStripDay {
  weekday: Weekday;
  gym: boolean;
  sport: boolean;
}

/** One entry per weekday (Monday first): is there gym and/or sport planned? */
export function weekStrip(routine: Routine, days: readonly RoutineDay[]): WeekStripDay[] {
  const hasGym = days.some((day) => day.kind === "gym");
  return WEEKDAYS.map((weekday) => ({
    weekday,
    gym:
      routine.schedule_type === "weekly"
        ? days.some((day) => day.kind === "gym" && day.weekday === weekday)
        : hasGym && routine.training_weekdays.includes(weekday),
    sport: days.some((day) => day.kind === "sport" && day.weekday === weekday),
  }));
}
