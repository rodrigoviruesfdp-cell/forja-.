/**
 * Weekly streak: weeks in a row (Monday to Sunday) in which you completed at least your
 * weekly target of sessions, gym and sports alike. The week in progress never breaks it:
 * it only adds to it once the target is reached.
 */
import { addDays, mondayOf } from "./dates";
import { plannedPerWeek } from "./routines/builder";
import type { Routine, RoutineDay, Session } from "./schemas";

export interface Streak {
  /** Weeks in a row up to now. */
  current: number;
  /** The longest run ever. */
  best: number;
  thisWeek: { done: number; target: number };
}

/** Sessions a week that keep the streak: the routine's target, or what it plans, or 1. */
export function weeklyTarget(routine: Routine | null, days: readonly RoutineDay[]): number {
  if (!routine) return 1;
  return Math.max(1, routine.weekly_target ?? plannedPerWeek(routine, days));
}

export function weeklyStreak(
  sessions: readonly Pick<Session, "date" | "status" | "deleted_at">[],
  target: number,
  today: string,
): Streak {
  const perWeek = new Map<string, number>();
  for (const session of sessions) {
    if (session.deleted_at || session.status !== "completed" || session.date > today) continue;
    const week = mondayOf(session.date);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  const thisMonday = mondayOf(today);
  const done = perWeek.get(thisMonday) ?? 0;
  const met = (week: string) => (perWeek.get(week) ?? 0) >= target;

  // Run ending last week, plus this week once it is met.
  let current = 0;
  for (let week = addDays(thisMonday, -7); met(week); week = addDays(week, -7)) current += 1;
  if (met(thisMonday)) current += 1;

  let best = 0;
  let run = 0;
  const weeks = [...perWeek.keys()].sort();
  if (weeks.length > 0) {
    for (let week = weeks[0] as string; week <= thisMonday; week = addDays(week, 7)) {
      run = met(week) ? run + 1 : 0;
      best = Math.max(best, run);
    }
  }
  return { current, best: Math.max(best, current), thisWeek: { done, target } };
}
