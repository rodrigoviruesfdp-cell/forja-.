"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { byPosition } from "@/domain/routines/builder";
import type { Exercise, Routine, RoutineDay, RoutineExercise } from "@/domain/schemas";
import { useUserData } from "@/features/user-data/user-data-context";

const alive = <T extends { deleted_at: string | null }>(row: T) => !row.deleted_at;

export interface RoutineSummary {
  routine: Routine;
  days: RoutineDay[];
  exerciseCount: number;
}

/** Every routine with its days (for the list and the week strips). Undefined while loading. */
export function useRoutineSummaries(): RoutineSummary[] | undefined {
  const { db } = useUserData();
  return useLiveQuery(async () => {
    const routines = (await db.routines.filter(alive).toArray()).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const days = await db.routine_days.filter(alive).toArray();
    const exercises = await db.routine_exercises.filter(alive).toArray();
    const daysByRoutine = new Map<string, RoutineDay[]>();
    for (const day of days) daysByRoutine.set(day.routine_id, [...(daysByRoutine.get(day.routine_id) ?? []), day]);
    const countByDay = new Map<string, number>();
    for (const item of exercises) countByDay.set(item.routine_day_id, (countByDay.get(item.routine_day_id) ?? 0) + 1);
    return routines.map((routine) => {
      const own = (daysByRoutine.get(routine.id) ?? []).sort(byPosition);
      return { routine, days: own, exerciseCount: own.reduce((sum, day) => sum + (countByDay.get(day.id) ?? 0), 0) };
    });
  }, [db]);
}

export interface RoutineTree {
  routine: Routine;
  days: RoutineDay[];
  /** Exercises of each day, in order. */
  exercises: Map<string, RoutineExercise[]>;
  /** Catalog/custom exercise rows referenced by the routine (deleted ones included, for history). */
  catalog: Map<string, Exercise>;
}

/** A routine with its days and exercises, live. Undefined while loading, null if missing or deleted. */
export function useRoutineTree(routineId: string | null): RoutineTree | null | undefined {
  const { db } = useUserData();
  return useLiveQuery(async () => {
    if (!routineId) return null;
    const routine = await db.routines.get(routineId);
    if (!routine || routine.deleted_at) return null;
    const days = (await db.routine_days.where("routine_id").equals(routineId).filter(alive).toArray()).sort(byPosition);
    const items = days.length
      ? await db.routine_exercises.where("routine_day_id").anyOf(days.map((d) => d.id)).filter(alive).toArray()
      : [];
    const exercises = new Map(days.map((day) => [day.id, [] as RoutineExercise[]]));
    for (const item of items.sort(byPosition)) exercises.get(item.routine_day_id)?.push(item);
    const rows = await db.exercises.bulkGet([...new Set(items.map((item) => item.exercise_id))]);
    const catalog = new Map(rows.flatMap((row) => (row ? [[row.id, row] as const] : [])));
    return { routine, days, exercises, catalog };
  }, [db, routineId]);
}

/** The id of the last gym day of `routine` you completed (drives the rotation). */
export function useLastGymDayId(days: readonly RoutineDay[] | undefined): string | null | undefined {
  const { db } = useUserData();
  const ids = (days ?? []).filter((day) => day.kind === "gym").map((day) => day.id);
  const key = ids.join(",");
  return useLiveQuery(async () => {
    if (ids.length === 0) return null;
    const sessions = await db.sessions
      .where("routine_day_id")
      .anyOf(ids)
      .filter((session) => !session.deleted_at && session.status === "completed")
      .toArray();
    sessions.sort((a, b) => b.date.localeCompare(a.date) || (b.ended_at ?? "").localeCompare(a.ended_at ?? ""));
    return sessions[0]?.routine_day_id ?? null;
  }, [db, key]);
}
