import type { LocalDb } from "@/data/local/db";
import { type Changes, saveChanges } from "@/data/local/mutations";
import {
  type Clock,
  clampWeeklyTarget,
  cleanName,
  convertSchedule,
  daySport,
  dayWeekday,
  duplicateDay,
  duplicateRoutine,
  LIMITS,
  moveExerciseToDay,
  type NewDayInput,
  newDay,
  newRoutine,
  newRoutineExercise,
  normalizeWeekdays,
  reorderByIds,
  type ScheduleType,
  type Weekday,
  withTargets,
} from "@/domain/routines/builder";
import { instantiateTemplate, type RoutineTemplate, type TemplateNames, templateSourceIds } from "@/domain/routines/templates";
import {
  PROFILE_DEFAULTS,
  type Profile,
  profileSchema,
  type Routine,
  type RoutineDay,
  type RoutineExercise,
} from "@/domain/schemas";

function clock(): Clock {
  return { now: new Date().toISOString(), newId: () => crypto.randomUUID() };
}

const alive = <T extends { deleted_at: string | null }>(row: T) => !row.deleted_at;

export async function routineDays(db: LocalDb, routineId: string): Promise<RoutineDay[]> {
  return db.routine_days.where("routine_id").equals(routineId).filter(alive).toArray();
}

export async function dayExercises(db: LocalDb, dayIds: readonly string[]): Promise<RoutineExercise[]> {
  if (dayIds.length === 0) return [];
  return db.routine_exercises.where("routine_day_id").anyOf([...dayIds]).filter(alive).toArray();
}

function withActiveRoutine(profile: Profile, routineId: string | null): Profile {
  return profileSchema.parse({ ...PROFILE_DEFAULTS, ...profile, active_routine_id: routineId });
}

function softDeleted<T extends { deleted_at: string | null }>(rows: readonly T[], now: string): T[] {
  return rows.map((row) => ({ ...row, deleted_at: now }));
}

/** Writes back the rows as they were before an action (the "Undo" of a toast). */
export async function restore(db: LocalDb, previous: Changes): Promise<void> {
  await saveChanges(db, previous);
}

// ---------------------------------------------------------------------------
// Routines

/** The first routine you create becomes the active one. */
export async function createRoutine(
  db: LocalDb,
  profile: Profile,
  input: { name: string; scheduleType: ScheduleType },
): Promise<Routine> {
  const routine = newRoutine({ userId: profile.id, ...input }, clock());
  await saveChanges(db, {
    routines: [routine],
    ...(profile.active_routine_id ? {} : { profiles: [withActiveRoutine(profile, routine.id)] }),
  });
  return routine;
}

export async function createFromTemplate(
  db: LocalDb,
  profile: Profile,
  template: RoutineTemplate,
  names: TemplateNames,
): Promise<Routine> {
  const wanted = new Set(templateSourceIds());
  const catalog = await db.exercises.filter((e) => !e.deleted_at && e.source_id !== null && wanted.has(e.source_id)).toArray();
  const bySource = new Map(catalog.map((e) => [e.source_id as string, e.id]));
  const { routine, days, exercises } = instantiateTemplate(template, profile.id, names, bySource, clock());
  await saveChanges(db, {
    routines: [routine],
    routine_days: days,
    routine_exercises: exercises,
    ...(profile.active_routine_id ? {} : { profiles: [withActiveRoutine(profile, routine.id)] }),
  });
  return routine;
}

export async function updateRoutine(
  db: LocalDb,
  routine: Routine,
  patch: Partial<Pick<Routine, "name" | "training_weekdays" | "weekly_target" | "notes">>,
): Promise<void> {
  const next: Routine = {
    ...routine,
    ...patch,
    name: patch.name === undefined ? routine.name : cleanName(patch.name, LIMITS.routineName, routine.name),
    training_weekdays: patch.training_weekdays ? normalizeWeekdays(patch.training_weekdays) : routine.training_weekdays,
    weekly_target: patch.weekly_target === undefined ? routine.weekly_target : clampWeeklyTarget(patch.weekly_target),
  };
  await saveChanges(db, { routines: [next] });
}

export async function changeScheduleType(db: LocalDb, routine: Routine, to: ScheduleType): Promise<void> {
  const days = await routineDays(db, routine.id);
  const result = convertSchedule(routine, days, to);
  await saveChanges(db, { routines: [result.routine], routine_days: result.days });
}

export async function setActiveRoutine(db: LocalDb, profile: Profile, routineId: string | null): Promise<void> {
  await saveChanges(db, { profiles: [withActiveRoutine(profile, routineId)] });
}

/** Soft-deletes the routine with its days and exercises. Returns what to restore for "Undo". */
export async function deleteRoutine(db: LocalDb, profile: Profile, routine: Routine): Promise<Changes> {
  const days = await routineDays(db, routine.id);
  const exercises = await dayExercises(db, days.map((d) => d.id));
  const now = new Date().toISOString();
  const wasActive = profile.active_routine_id === routine.id;
  await saveChanges(db, {
    routines: softDeleted([routine], now),
    routine_days: softDeleted(days, now),
    routine_exercises: softDeleted(exercises, now),
    ...(wasActive ? { profiles: [withActiveRoutine(profile, null)] } : {}),
  });
  return {
    routines: [routine],
    routine_days: days,
    routine_exercises: exercises,
    ...(wasActive ? { profiles: [withActiveRoutine(profile, routine.id)] } : {}),
  };
}

export async function copyRoutine(db: LocalDb, routine: Routine, name: string): Promise<Routine> {
  const days = await routineDays(db, routine.id);
  const exercises = await dayExercises(db, days.map((d) => d.id));
  const copy = duplicateRoutine(routine, days, exercises, name, clock());
  await saveChanges(db, { routines: [copy.routine], routine_days: copy.days, routine_exercises: copy.exercises });
  return copy.routine;
}

// ---------------------------------------------------------------------------
// Days

export async function addDay(db: LocalDb, routine: Routine, input: NewDayInput): Promise<RoutineDay> {
  const siblings = await routineDays(db, routine.id);
  const day = newDay(routine, siblings, input, clock());
  await saveChanges(db, { routine_days: [day] });
  return day;
}

export async function updateDay(
  db: LocalDb,
  routine: Routine,
  day: RoutineDay,
  patch: { name?: string; sport?: string; weekday?: Weekday | null; notes?: string | null },
): Promise<void> {
  const sport = daySport(day.kind, patch.sport ?? day.sport, day.name);
  const next: RoutineDay = {
    ...day,
    name: patch.name === undefined ? day.name : cleanName(patch.name, LIMITS.dayName, patch.sport ?? day.name),
    sport,
    weekday: patch.weekday === undefined ? day.weekday : dayWeekday(routine, day.kind, patch.weekday),
    notes: patch.notes === undefined ? day.notes : patch.notes,
  };
  await saveChanges(db, { routine_days: [next] });
}

/** Soft-deletes a day and its exercises. Returns what to restore for "Undo". */
export async function deleteDay(db: LocalDb, day: RoutineDay): Promise<Changes> {
  const exercises = await dayExercises(db, [day.id]);
  const now = new Date().toISOString();
  await saveChanges(db, { routine_days: softDeleted([day], now), routine_exercises: softDeleted(exercises, now) });
  return { routine_days: [day], routine_exercises: exercises };
}

export async function copyDay(
  db: LocalDb,
  routine: Routine,
  day: RoutineDay,
  options: { name: string; weekday?: Weekday | null },
): Promise<RoutineDay> {
  const days = await routineDays(db, routine.id);
  const exercises = await dayExercises(db, [day.id]);
  const result = duplicateDay(routine, days, day, exercises, options, clock());
  await saveChanges(db, { routine_days: result.days, routine_exercises: result.exercises });
  return result.day;
}

/** New order of the rotation (gym day ids, first = A). */
export async function reorderDays(db: LocalDb, routine: Routine, orderedIds: readonly string[]): Promise<void> {
  const days = await routineDays(db, routine.id);
  const ordered = new Set(orderedIds);
  await saveChanges(db, { routine_days: reorderByIds(days.filter((d) => ordered.has(d.id)), orderedIds) });
}

// ---------------------------------------------------------------------------
// Exercises in a day

export async function addExercises(db: LocalDb, day: RoutineDay, exerciseIds: readonly string[]): Promise<void> {
  const siblings = await dayExercises(db, [day.id]);
  const c = clock();
  const added: RoutineExercise[] = [];
  for (const exerciseId of exerciseIds) added.push(newRoutineExercise(day, [...siblings, ...added], exerciseId, c));
  await saveChanges(db, { routine_exercises: added });
}

export async function updateRoutineExercise(
  db: LocalDb,
  item: RoutineExercise,
  patch: Partial<Pick<RoutineExercise, "target_sets" | "target_reps_min" | "target_reps_max" | "notes">>,
): Promise<RoutineExercise> {
  const { notes, ...targets } = patch;
  const next = { ...withTargets(item, targets), ...(notes === undefined ? {} : { notes }) };
  await saveChanges(db, { routine_exercises: [next] });
  return next;
}

/** Returns what to restore for "Undo". */
export async function removeRoutineExercise(db: LocalDb, item: RoutineExercise): Promise<Changes> {
  await saveChanges(db, { routine_exercises: softDeleted([item], new Date().toISOString()) });
  return { routine_exercises: [item] };
}

export async function reorderExercises(db: LocalDb, dayId: string, orderedIds: readonly string[]): Promise<void> {
  const items = await dayExercises(db, [dayId]);
  await saveChanges(db, { routine_exercises: reorderByIds(items, orderedIds) });
}

export async function moveExercise(db: LocalDb, item: RoutineExercise, to: RoutineDay): Promise<void> {
  const [from, target] = await Promise.all([dayExercises(db, [item.routine_day_id]), dayExercises(db, [to.id])]);
  await saveChanges(db, { routine_exercises: moveExerciseToDay(item, from, to, target) });
}
