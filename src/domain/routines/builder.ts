/**
 * Routine building rules, as pure functions that return the rows to save.
 * Nothing here touches the database: the repository saves what these return.
 */
import type { Routine, RoutineDay, RoutineExercise } from "../schemas";

export type ScheduleType = Routine["schedule_type"];
export type DayKind = RoutineDay["kind"];
/** 0 = Monday … 6 = Sunday (same as the database). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/** Timestamp and id source, injected so the rules stay testable. */
export interface Clock {
  now: string;
  newId: () => string;
}

export const LIMITS = {
  routineName: 80,
  dayName: 60,
  sport: 60,
  sets: { min: 1, max: 20 },
  reps: { min: 1, max: 100 },
  weeklyTarget: { min: 1, max: 14 },
} as const;

export const DEFAULT_TARGETS = { sets: 3, repsMin: 8, repsMax: 12 } as const;

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

/** Monday-based weekday of a calendar date (local time). */
export function weekdayOf(date: Date): Weekday {
  return ((date.getDay() + 6) % 7) as Weekday;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Trimmed and cut to the database limit; falls back when left empty. */
export function cleanName(value: string, max: number, fallback: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, max);
  return trimmed === "" ? fallback.slice(0, max) : trimmed;
}

// ---------------------------------------------------------------------------
// Ordering

interface Ordered {
  id: string;
  position: number;
  created_at: string;
}

export function byPosition<T extends Ordered>(a: T, b: T): number {
  return a.position - b.position || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
}

export function nextPosition(items: readonly { position: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.position + 1), 0);
}

/** Positions 0..n-1 in the given order. Returns only the rows whose position changed. */
export function renumber<T extends { id: string; position: number }>(ordered: readonly T[]): T[] {
  return ordered.flatMap((item, index) => (item.position === index ? [] : [{ ...item, position: index }]));
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(clamp(to, 0, next.length), 0, item);
  return next;
}

/** Rows of `items` reordered to match `ids` (ids not found are ignored, missing rows go last). */
export function reorderByIds<T extends { id: string; position: number }>(items: readonly T[], ids: readonly string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = ids.flatMap((id) => {
    const item = byId.get(id);
    byId.delete(id);
    return item ? [item] : [];
  });
  return renumber([...ordered, ...byId.values()]);
}

/** A, B, C… for rotation days (then 27, 28… past Z). */
export function rotationLetter(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

// ---------------------------------------------------------------------------
// Routines

export function newRoutine(
  input: { userId: string; name: string; scheduleType: ScheduleType; trainingWeekdays?: readonly Weekday[] },
  clock: Clock,
): Routine {
  return {
    id: clock.newId(),
    user_id: input.userId,
    name: cleanName(input.name, LIMITS.routineName, "Rutina"),
    schedule_type: input.scheduleType,
    training_weekdays: normalizeWeekdays(input.trainingWeekdays ?? []),
    weekly_target: null,
    notes: null,
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
}

export function normalizeWeekdays(days: readonly number[]): Weekday[] {
  return [...new Set(days.filter(isWeekday))].sort((a, b) => a - b);
}

export function toggleWeekday(days: readonly number[], day: Weekday): Weekday[] {
  return normalizeWeekdays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
}

export function clampWeeklyTarget(value: number | null): number | null {
  return value === null ? null : clamp(value, LIMITS.weeklyTarget.min, LIMITS.weeklyTarget.max);
}

// ---------------------------------------------------------------------------
// Days

export interface NewDayInput {
  kind: DayKind;
  name: string;
  /** Required for sport days. */
  sport?: string | null;
  weekday?: Weekday | null;
}

/**
 * Weekly routines: every day has a weekday. Rotations: gym days have none (they go in
 * order, A, B, C…); sport days may be pinned to one.
 */
export function dayWeekday(routine: Pick<Routine, "schedule_type">, kind: DayKind, weekday: Weekday | null | undefined): Weekday | null {
  if (routine.schedule_type === "rotation" && kind === "gym") return null;
  return weekday ?? null;
}

export function newDay(routine: Routine, siblings: readonly RoutineDay[], input: NewDayInput, clock: Clock): RoutineDay {
  const sport = input.kind === "sport" ? cleanName(input.sport ?? "", LIMITS.sport, input.name) : null;
  return {
    id: clock.newId(),
    user_id: routine.user_id,
    routine_id: routine.id,
    name: cleanName(input.name, LIMITS.dayName, sport ?? "Día"),
    kind: input.kind,
    sport,
    weekday: dayWeekday(routine, input.kind, input.weekday),
    position: nextPosition(siblings),
    notes: null,
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
}

/** Rotation days in training order (gym days only). */
export function rotationOrder(days: readonly RoutineDay[]): RoutineDay[] {
  return days.filter((day) => day.kind === "gym").sort(byPosition);
}

/** Sport days, pinned ones by weekday first. */
export function sportDays(days: readonly RoutineDay[]): RoutineDay[] {
  return days
    .filter((day) => day.kind === "sport")
    .sort((a, b) => (a.weekday ?? 7) - (b.weekday ?? 7) || byPosition(a, b));
}

/** Weekly routine laid out Monday → Sunday, plus days still without a weekday. */
export function weekLayout(days: readonly RoutineDay[]): { byWeekday: RoutineDay[][]; unassigned: RoutineDay[] } {
  const byWeekday: RoutineDay[][] = WEEKDAYS.map(() => []);
  const unassigned: RoutineDay[] = [];
  for (const day of [...days].sort(byPosition)) {
    if (day.weekday === null) unassigned.push(day);
    else byWeekday[day.weekday]?.push(day);
  }
  return { byWeekday, unassigned };
}

/**
 * Copy of a day and its exercises. In a rotation the copy goes right after the original
 * (the rest move down one place); in a weekly routine it goes to `weekday`.
 * `days` holds every day row to save: the copy plus the ones whose position shifted.
 */
export function duplicateDay(
  routine: Routine,
  days: readonly RoutineDay[],
  day: RoutineDay,
  exercises: readonly RoutineExercise[],
  options: { name: string; weekday?: Weekday | null },
  clock: Clock,
): { day: RoutineDay; days: RoutineDay[]; exercises: RoutineExercise[] } {
  const copy: RoutineDay = {
    ...day,
    id: clock.newId(),
    name: cleanName(options.name, LIMITS.dayName, day.name),
    weekday: routine.schedule_type === "weekly" ? (options.weekday ?? day.weekday) : day.weekday,
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
  const ordered = [...days].sort(byPosition);
  const index = ordered.findIndex((d) => d.id === day.id);
  ordered.splice(index + 1, 0, { ...copy, position: Number.NaN });
  const shifted = renumber(ordered);
  const placed = shifted.find((d) => d.id === copy.id) ?? { ...copy, position: nextPosition(days) };
  return {
    day: placed,
    days: shifted,
    exercises: exercises.map((exercise) => ({
      ...exercise,
      id: clock.newId(),
      routine_day_id: copy.id,
      created_at: clock.now,
      updated_at: clock.now,
      deleted_at: null,
    })),
  };
}

/**
 * Switching between weekly and rotation keeps everything that still makes sense:
 * - weekly → rotation: gym days keep their order (by weekday) as A, B, C…; the weekdays
 *   they had become the "days you usually train"; sport days stay pinned.
 * - rotation → weekly: gym days take the training weekdays in order; any left over
 *   (or all, if none were set) wait in "no day yet" until you pick one.
 * Returns the routine and the days that changed.
 */
export function convertSchedule(
  routine: Routine,
  days: readonly RoutineDay[],
  to: ScheduleType,
): { routine: Routine; days: RoutineDay[] } {
  if (routine.schedule_type === to) return { routine, days: [] };

  if (to === "rotation") {
    const gym = days
      .filter((day) => day.kind === "gym")
      .sort((a, b) => (a.weekday ?? 7) - (b.weekday ?? 7) || byPosition(a, b));
    const trainingWeekdays = normalizeWeekdays(gym.flatMap((day) => (day.weekday === null ? [] : [day.weekday])));
    const changed = gym.flatMap((day, index) =>
      day.position === index && day.weekday === null ? [] : [{ ...day, position: index, weekday: null }],
    );
    return {
      routine: { ...routine, schedule_type: "rotation", training_weekdays: trainingWeekdays },
      days: changed,
    };
  }

  const gym = rotationOrder(days);
  const slots = normalizeWeekdays(routine.training_weekdays);
  const changed = gym.flatMap((day, index) => {
    const weekday = slots[index] ?? null;
    return day.weekday === weekday ? [] : [{ ...day, weekday }];
  });
  return { routine: { ...routine, schedule_type: "weekly" }, days: changed };
}

// ---------------------------------------------------------------------------
// Exercises in a day

export function newRoutineExercise(
  day: RoutineDay,
  siblings: readonly RoutineExercise[],
  exerciseId: string,
  clock: Clock,
  targets: { sets: number; repsMin: number; repsMax: number | null } = DEFAULT_TARGETS,
): RoutineExercise {
  const fixed = withTargets(
    { target_sets: DEFAULT_TARGETS.sets, target_reps_min: DEFAULT_TARGETS.repsMin, target_reps_max: DEFAULT_TARGETS.repsMax },
    { target_sets: targets.sets, target_reps_min: targets.repsMin, target_reps_max: targets.repsMax },
  );
  return {
    id: clock.newId(),
    user_id: day.user_id,
    routine_day_id: day.id,
    exercise_id: exerciseId,
    position: nextPosition(siblings),
    ...fixed,
    notes: null,
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
}

type Targets = Pick<RoutineExercise, "target_sets" | "target_reps_min" | "target_reps_max">;

/**
 * Applies a change to sets/reps within the database limits, keeping max ≥ min:
 * raising the minimum above the maximum pushes the maximum up, and lowering the maximum
 * below the minimum pulls the minimum down. A max equal to the min means fixed reps (null).
 */
export function withTargets<T extends Targets>(current: T, patch: Partial<Targets>): T {
  const sets = clamp(patch.target_sets ?? current.target_sets, LIMITS.sets.min, LIMITS.sets.max);
  let min = clamp(patch.target_reps_min ?? current.target_reps_min, LIMITS.reps.min, LIMITS.reps.max);
  const rawMax = patch.target_reps_max === undefined ? current.target_reps_max : patch.target_reps_max;
  let max = rawMax === null ? null : clamp(rawMax, LIMITS.reps.min, LIMITS.reps.max);
  if (max !== null && max < min) {
    if (patch.target_reps_min !== undefined) max = min;
    else min = max;
  }
  if (max === min) max = null;
  return { ...current, target_sets: sets, target_reps_min: min, target_reps_max: max };
}

/** "3 × 8–12" or "4 × 5". */
export function targetLabel(targets: Targets): string {
  const reps = targets.target_reps_max === null ? `${targets.target_reps_min}` : `${targets.target_reps_min}–${targets.target_reps_max}`;
  return `${targets.target_sets} × ${reps}`;
}

/** Moves an exercise to the end of another day; the old day closes the gap. */
export function moveExerciseToDay(
  exercise: RoutineExercise,
  from: readonly RoutineExercise[],
  to: RoutineDay,
  toSiblings: readonly RoutineExercise[],
): RoutineExercise[] {
  const moved = { ...exercise, routine_day_id: to.id, position: nextPosition(toSiblings) };
  const rest = renumber(from.filter((item) => item.id !== exercise.id).sort(byPosition));
  return [moved, ...rest];
}

// ---------------------------------------------------------------------------
// Whole routine

/** Deep copy (routine, days, exercises) with new ids. */
export function duplicateRoutine(
  routine: Routine,
  days: readonly RoutineDay[],
  exercises: readonly RoutineExercise[],
  name: string,
  clock: Clock,
): { routine: Routine; days: RoutineDay[]; exercises: RoutineExercise[] } {
  const copy: Routine = {
    ...routine,
    id: clock.newId(),
    name: cleanName(name, LIMITS.routineName, routine.name),
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
  const dayIds = new Map(days.map((day) => [day.id, clock.newId()]));
  return {
    routine: copy,
    days: days.map((day) => ({
      ...day,
      id: dayIds.get(day.id) as string,
      routine_id: copy.id,
      created_at: clock.now,
      updated_at: clock.now,
      deleted_at: null,
    })),
    exercises: exercises.flatMap((exercise) => {
      const dayId = dayIds.get(exercise.routine_day_id);
      return dayId
        ? [{ ...exercise, id: clock.newId(), routine_day_id: dayId, created_at: clock.now, updated_at: clock.now, deleted_at: null }]
        : [];
    }),
  };
}

/** Sessions a week the routine plans (the weekly target falls back to this). */
export function plannedPerWeek(routine: Routine, days: readonly RoutineDay[]): number {
  if (routine.schedule_type === "weekly") return days.filter((day) => day.weekday !== null).length;
  const pinnedSports = days.filter((day) => day.kind === "sport" && day.weekday !== null).length;
  const gymDays = days.some((day) => day.kind === "gym") ? routine.training_weekdays.length : 0;
  return gymDays + pinnedSports;
}
