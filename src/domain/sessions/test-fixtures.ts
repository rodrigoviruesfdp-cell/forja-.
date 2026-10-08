import { NOW, USER } from "../routines/test-fixtures";
import type { Session, SessionExercise, SessionSet } from "../schemas";

export { NOW, USER };

let sessionCounter = 0;
export function session(patch: Partial<Session> = {}): Session {
  sessionCounter += 1;
  return {
    id: `55555555-0000-4000-8000-${String(sessionCounter).padStart(12, "0")}`,
    user_id: USER,
    date: "2026-10-07",
    kind: "gym",
    routine_day_id: null,
    title: "Pecho",
    sport: null,
    duration_min: null,
    rpe: null,
    distance_km: null,
    notes: null,
    status: "in_progress",
    visibility: "private",
    started_at: NOW,
    ended_at: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...patch,
  };
}

let itemCounter = 0;
export function sessionExercise(patch: Partial<SessionExercise> = {}): SessionExercise {
  itemCounter += 1;
  return {
    id: `66666666-0000-4000-8000-${String(itemCounter).padStart(12, "0")}`,
    user_id: USER,
    session_id: "55555555-0000-4000-8000-000000000001",
    exercise_id: "cccccccc-0000-4000-8000-000000000001",
    routine_exercise_id: null,
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

let setCounter = 0;
/** A done set; `at` = minutes after NOW (also its order). */
export function set(weightKg: number, reps: number, patch: Partial<SessionSet> & { at?: number } = {}): SessionSet {
  setCounter += 1;
  const { at = setCounter, ...rest } = patch;
  return {
    id: `77777777-0000-4000-8000-${String(setCounter).padStart(12, "0")}`,
    user_id: USER,
    session_exercise_id: "66666666-0000-4000-8000-000000000001",
    set_number: setCounter,
    weight_kg: weightKg,
    reps,
    rpe: null,
    is_warmup: false,
    is_pr: false,
    completed_at: new Date(Date.parse(NOW) + at * 60_000).toISOString(),
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...rest,
  };
}
