/**
 * Live session rules, as pure functions that return the rows to save.
 *
 * Only sets you actually did are stored. The rows still to do are worked out on the fly
 * from the session's target (`session_exercises.target_sets`, copied from the routine when
 * the session starts): nothing to clean up if you stop early, and one write per set.
 */
import { localDate } from "../dates";
import { byPosition, type Clock, cleanName, DEFAULT_TARGETS, nextPosition } from "../routines/builder";
import type { RoutineDay, RoutineExercise, Session, SessionExercise, SessionSet } from "../schemas";
import { displayDecimals, fromKg, roundTo, toKg, type WeightUnit } from "../units";
import { estimateOneRepMax } from "./one-rep-max";
import { isWorkSet, type RecordKind } from "./records";

export const SET_LIMITS = {
  weightKg: 9999,
  reps: 1000,
  setNumber: 100,
  plannedSets: { min: 1, max: 20 },
  titleLength: 80,
} as const;

/** Weight buttons step by a small plate pair. */
export const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

/** If the last set is older than this when you finish, you forgot to finish: the session ended at that set. */
export const IDLE_MINUTES = 30;

const alive = <T extends { deleted_at: string | null }>(row: T) => !row.deleted_at;


// ---------------------------------------------------------------------------
// Starting

export interface StartInput {
  userId: string;
  /** The routine day you start (its exercises are copied), or null for a free session. */
  day: RoutineDay | null;
  items: readonly RoutineExercise[];
  title: string;
}

/** A session in progress with a copy of the day's exercises and targets (editing the routine later never rewrites it). */
export function startSession(input: StartInput, clock: Clock): { session: Session; exercises: SessionExercise[] } {
  const session: Session = {
    id: clock.newId(),
    user_id: input.userId,
    date: localDate(new Date(clock.now)),
    kind: "gym",
    routine_day_id: input.day?.id ?? null,
    title: cleanName(input.title, SET_LIMITS.titleLength, "Entreno"),
    sport: null,
    duration_min: null,
    rpe: null,
    distance_km: null,
    notes: null,
    status: "in_progress",
    visibility: "private",
    started_at: clock.now,
    ended_at: null,
    place_id: null,
    metrics: {},
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
  const exercises = [...input.items]
    .filter(alive)
    .sort(byPosition)
    .map(
      (item, position): SessionExercise => ({
        id: clock.newId(),
        user_id: input.userId,
        session_id: session.id,
        exercise_id: item.exercise_id,
        routine_exercise_id: item.id,
        position,
        target_sets: item.target_sets,
        target_reps_min: item.target_reps_min,
        target_reps_max: item.target_reps_max,
        notes: item.notes,
        created_at: clock.now,
        updated_at: clock.now,
        deleted_at: null,
      }),
    );
  return { session, exercises };
}

/** An exercise added during the session (default target: 3 × 8–12). */
export function newSessionExercise(
  session: Session,
  siblings: readonly SessionExercise[],
  exerciseId: string,
  clock: Clock,
): SessionExercise {
  return {
    id: clock.newId(),
    user_id: session.user_id,
    session_id: session.id,
    exercise_id: exerciseId,
    routine_exercise_id: null,
    position: nextPosition(siblings.filter(alive)),
    target_sets: DEFAULT_TARGETS.sets,
    target_reps_min: DEFAULT_TARGETS.repsMin,
    target_reps_max: DEFAULT_TARGETS.repsMax,
    notes: null,
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
}

// ---------------------------------------------------------------------------
// Sets

export interface SetInput {
  weightKg: number;
  reps: number;
  isWarmup: boolean;
}

function cleanWeight(kg: number): number {
  return Number.isFinite(kg) ? roundTo(Math.min(SET_LIMITS.weightKg, Math.max(0, kg)), 3) : 0;
}

function cleanReps(reps: number): number {
  return Number.isFinite(reps) ? Math.min(SET_LIMITS.reps, Math.max(0, Math.round(reps))) : 0;
}

/** A set you just did. `is_pr` is filled in afterwards, from the exercise's history. */
export function newSet(item: SessionExercise, siblings: readonly SessionSet[], input: SetInput, clock: Clock): SessionSet {
  const last = siblings.filter(alive).reduce((max, set) => Math.max(max, set.set_number), 0);
  return {
    id: clock.newId(),
    user_id: item.user_id,
    session_exercise_id: item.id,
    set_number: Math.min(SET_LIMITS.setNumber, last + 1),
    weight_kg: cleanWeight(input.weightKg),
    reps: cleanReps(input.reps),
    rpe: null,
    is_warmup: input.isWarmup,
    is_pr: false,
    completed_at: clock.now,
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
}

export function editSet(set: SessionSet, patch: Partial<SetInput>): SessionSet {
  return {
    ...set,
    weight_kg: patch.weightKg === undefined ? set.weight_kg : cleanWeight(patch.weightKg),
    reps: patch.reps === undefined ? set.reps : cleanReps(patch.reps),
    is_warmup: patch.isWarmup ?? set.is_warmup,
  };
}

/** The sets of one exercise in the order you did them. */
export function orderedSets(sets: readonly SessionSet[]): SessionSet[] {
  return sets
    .filter(alive)
    .sort((a, b) => a.set_number - b.set_number || (a.completed_at ?? "").localeCompare(b.completed_at ?? ""));
}

export function plannedSets(item: SessionExercise): number {
  return item.target_sets ?? DEFAULT_TARGETS.sets;
}

/** Work sets still to do (warm-ups never count against the target). */
export function pendingSets(item: SessionExercise, sets: readonly SessionSet[]): number {
  const done = sets.filter((set) => alive(set) && !set.is_warmup).length;
  return Math.max(0, plannedSets(item) - done);
}

/** Changes how many work sets are planned ("+ Serie" / remove a pending one). */
export function withPlannedSets(item: SessionExercise, sets: readonly SessionSet[], planned: number): SessionExercise {
  const done = sets.filter((set) => alive(set) && !set.is_warmup).length;
  const { min, max } = SET_LIMITS.plannedSets;
  return { ...item, target_sets: Math.min(max, Math.max(min, done, Math.round(planned))) };
}

export interface Suggestion {
  /** Null when there is nothing to go by (first time, nothing logged yet). */
  weightKg: number | null;
  reps: number;
}

const sameSet = (a: SessionSet, b: SessionSet) => Math.abs(a.weight_kg - b.weight_kg) < 1e-6 && a.reps === b.reps;

/**
 * What to pre-fill in the next `count` rows, so a set is usually one tap:
 *  - while you repeat last time, the next sets of last time (pyramids included);
 *  - once you change something, your last set carries forward;
 *  - first time: no weight, and the low end of the target reps.
 */
export function suggestSets(
  item: SessionExercise,
  done: readonly SessionSet[],
  lastTime: readonly SessionSet[] | null,
  count: number,
): Suggestion[] {
  const doneWork = orderedSets(done).filter((set) => !set.is_warmup);
  const lastWork = orderedSets(lastTime ?? []).filter((set) => !set.is_warmup);
  const followsLastTime = lastWork.length > 0 && doneWork.every((set, i) => lastWork[i] && sameSet(set, lastWork[i]));
  const carried = doneWork.at(-1);
  const fallback: Suggestion = { weightKg: null, reps: item.target_reps_min ?? DEFAULT_TARGETS.repsMin };
  return Array.from({ length: count }, (_, i) => {
    const fromLastTime = followsLastTime ? (lastWork[doneWork.length + i] ?? carried ?? lastWork.at(-1)) : carried;
    return fromLastTime ? { weightKg: fromLastTime.weight_kg, reps: fromLastTime.reps } : fallback;
  });
}

/** Last time's work sets as suggestions for the rows still to do ("copy last time"). */
export function copyLastTime(done: readonly SessionSet[], lastTime: readonly SessionSet[], count: number): Suggestion[] {
  const doneWork = orderedSets(done).filter((set) => !set.is_warmup).length;
  const lastWork = orderedSets(lastTime).filter((set) => !set.is_warmup);
  return Array.from({ length: count }, (_, i) => {
    const set = lastWork[doneWork + i] ?? lastWork.at(-1);
    return set ? { weightKg: set.weight_kg, reps: set.reps } : { weightKg: null, reps: DEFAULT_TARGETS.repsMin };
  });
}

/** The weight buttons: one plate step up or down, in the unit you see. */
export function stepWeight(kg: number, unit: WeightUnit, direction: 1 | -1): number {
  const shown = fromKg(kg, unit) + direction * WEIGHT_STEP[unit];
  return toKg(Math.max(0, roundTo(shown, displayDecimals(unit))), unit);
}

// ---------------------------------------------------------------------------
// Finishing ("Terminar sesión"): one place that closes the session and sums it up.

/** When the session ended: now, or the last set if you forgot to finish. */
export function sessionEnd(lastSetAt: string | null, now: string): string {
  if (lastSetAt && Date.parse(now) - Date.parse(lastSetAt) > IDLE_MINUTES * 60_000) return lastSetAt;
  return now;
}

export function durationMinutes(startedAt: string | null, endedAt: string | null): number | null {
  if (!startedAt || !endedAt) return null;
  const minutes = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000);
  return Number.isFinite(minutes) ? Math.min(1440, Math.max(0, minutes)) : null;
}

export function lastSetAt(sets: readonly SessionSet[]): string | null {
  return sets.filter(alive).reduce<string | null>((max, set) => {
    const at = set.completed_at;
    return at && (!max || at > max) ? at : max;
  }, null);
}

export interface ExerciseRecord {
  sessionExerciseId: string;
  exerciseId: string;
  kinds: RecordKind[];
  /** The best record set of the session for that exercise. */
  weightKg: number;
  reps: number;
  e1rm: number | null;
}

export interface SessionSummary {
  durationMin: number | null;
  /** Exercises with at least one work set. */
  exercises: number;
  workSets: number;
  /** Σ weight × reps of the work sets. */
  volumeKg: number;
  records: ExerciseRecord[];
}

function strength(set: SessionSet): number {
  return estimateOneRepMax(set.weight_kg, set.reps) ?? set.weight_kg;
}

/**
 * The numbers of a session: shown when you finish, and the hook for what comes later
 * (achievements, the image to share). `records` = record kinds of this session's sets.
 */
export function summarizeSession(
  session: Session,
  exercises: readonly SessionExercise[],
  sets: readonly SessionSet[],
  records: ReadonlyMap<string, RecordKind[]>,
  now: string,
): SessionSummary {
  const byExercise = new Map<string, SessionSet[]>();
  for (const set of sets.filter(alive)) {
    byExercise.set(set.session_exercise_id, [...(byExercise.get(set.session_exercise_id) ?? []), set]);
  }
  const summary: SessionSummary = {
    durationMin:
      session.status === "completed"
        ? session.duration_min
        : durationMinutes(session.started_at, sessionEnd(lastSetAt(sets), now)),
    exercises: 0,
    workSets: 0,
    volumeKg: 0,
    records: [],
  };
  for (const item of [...exercises].filter(alive).sort(byPosition)) {
    const work = (byExercise.get(item.id) ?? []).filter(isWorkSet);
    if (work.length === 0) continue;
    summary.exercises += 1;
    summary.workSets += work.length;
    summary.volumeKg += work.reduce((sum, set) => sum + set.weight_kg * set.reps, 0);
    const prs = work.filter((set) => records.has(set.id));
    const best = prs.sort((a, b) => strength(b) - strength(a) || b.reps - a.reps)[0];
    if (best) {
      const kinds = [...new Set(prs.flatMap((set) => records.get(set.id) ?? []))];
      summary.records.push({
        sessionExerciseId: item.id,
        exerciseId: item.exercise_id,
        kinds,
        weightKg: best.weight_kg,
        reps: best.reps,
        e1rm: estimateOneRepMax(best.weight_kg, best.reps),
      });
    }
  }
  summary.volumeKg = roundTo(summary.volumeKg, 3);
  return summary;
}

export interface FinishInput {
  /** How hard it was, 1–10 (optional, one tap). */
  rpe: number | null;
  notes: string | null;
}

/** The completed session row. Exercises you did not do are removed (see `unusedExercises`). */
export function finishSession(session: Session, sets: readonly SessionSet[], input: FinishInput, now: string): Session {
  const endedAt = sessionEnd(lastSetAt(sets), now);
  const rpe = input.rpe === null ? null : Math.min(10, Math.max(1, Math.round(input.rpe)));
  const notes = input.notes?.trim() ? input.notes.trim() : null;
  return {
    ...session,
    status: "completed",
    ended_at: endedAt,
    duration_min: durationMinutes(session.started_at, endedAt),
    rpe,
    notes,
  };
}

/** Exercises of the session without a single set: not part of the history. */
export function unusedExercises(exercises: readonly SessionExercise[], sets: readonly SessionSet[]): SessionExercise[] {
  const used = new Set(sets.filter(alive).map((set) => set.session_exercise_id));
  return exercises.filter((item) => alive(item) && !used.has(item.id));
}
