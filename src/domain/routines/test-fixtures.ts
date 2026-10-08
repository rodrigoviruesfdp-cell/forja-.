import type { Routine, RoutineDay, RoutineExercise } from "../schemas";
import type { Clock } from "./builder";

export const USER = "11111111-1111-4111-8111-111111111111";
export const NOW = "2026-10-07T10:00:00.000Z";

/** Deterministic ids: 00000000-0000-4000-8000-000000000001, …002, … */
export function testClock(start = 1): Clock {
  let next = start;
  return {
    now: NOW,
    newId: () => `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`,
  };
}

export function routine(patch: Partial<Routine> = {}): Routine {
  return {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    user_id: USER,
    name: "Mi rutina",
    schedule_type: "weekly",
    training_weekdays: [],
    weekly_target: null,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...patch,
  };
}

let dayCounter = 0;
export function day(patch: Partial<RoutineDay> = {}): RoutineDay {
  dayCounter += 1;
  return {
    id: `dddddddd-0000-4000-8000-${String(dayCounter).padStart(12, "0")}`,
    user_id: USER,
    routine_id: "aaaaaaaa-0000-4000-8000-000000000001",
    name: `Día ${dayCounter}`,
    kind: "gym",
    sport: null,
    weekday: null,
    position: 0,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...patch,
  };
}

let exerciseCounter = 0;
export function routineExercise(patch: Partial<RoutineExercise> = {}): RoutineExercise {
  exerciseCounter += 1;
  return {
    id: `eeeeeeee-0000-4000-8000-${String(exerciseCounter).padStart(12, "0")}`,
    user_id: USER,
    routine_day_id: "dddddddd-0000-4000-8000-000000000001",
    exercise_id: "cccccccc-0000-4000-8000-000000000001",
    position: 0,
    target_sets: 3,
    target_reps_min: 8,
    target_reps_max: 12,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...patch,
  };
}
