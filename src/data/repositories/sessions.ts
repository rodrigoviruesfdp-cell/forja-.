import type { LocalDb } from "@/data/local/db";
import { type Changes, saveChanges } from "@/data/local/mutations";
import { byPosition, type Clock, moveItem, renumber } from "@/domain/routines/builder";
import { findRecords, type HistorySet, type RecordKind, staleRecordFlags } from "@/domain/sessions/records";
import {
  editSet,
  type FinishInput,
  finishSession as finishSessionRow,
  newSessionExercise,
  newSet,
  orderedSets,
  type SessionSummary,
  type SetInput,
  startSession as startSessionRows,
  summarizeSession,
  unusedExercises,
  withPlannedSets,
} from "@/domain/sessions/session";
import type { RoutineDay, Session, SessionExercise, SessionSet } from "@/domain/schemas";

function clock(): Clock {
  return { now: new Date().toISOString(), newId: () => crypto.randomUUID() };
}

const alive = <T extends { deleted_at: string | null }>(row: T) => !row.deleted_at;

function softDeleted<T extends { deleted_at: string | null }>(rows: readonly T[], now: string): T[] {
  return rows.map((row) => ({ ...row, deleted_at: now }));
}

/** Puts back what an action removed (the "Undo" of a toast). */
export type Undo = () => Promise<void>;

// ---------------------------------------------------------------------------
// Queries

export async function sessionExercises(db: LocalDb, sessionId: string): Promise<SessionExercise[]> {
  return (await db.session_exercises.where("session_id").equals(sessionId).filter(alive).toArray()).sort(byPosition);
}

export async function setsOf(db: LocalDb, itemIds: readonly string[]): Promise<SessionSet[]> {
  if (itemIds.length === 0) return [];
  return db.session_sets.where("session_exercise_id").anyOf([...itemIds]).filter(alive).toArray();
}

export interface LastPerformance {
  session: Session;
  sets: SessionSet[];
}

/** What you did the last time you finished a session with this exercise. */
export async function lastPerformance(
  db: LocalDb,
  exerciseId: string,
  excludeSessionId: string | null,
): Promise<LastPerformance | null> {
  const items = await db.session_exercises.where("exercise_id").equals(exerciseId).filter(alive).toArray();
  const sessions = (await db.sessions.bulkGet([...new Set(items.map((item) => item.session_id))])).filter(
    (s): s is Session => !!s && !s.deleted_at && s.status === "completed" && s.id !== excludeSessionId,
  );
  sessions.sort((a, b) => b.date.localeCompare(a.date) || (b.ended_at ?? "").localeCompare(a.ended_at ?? ""));
  for (const session of sessions) {
    const own = items.filter((item) => item.session_id === session.id).sort(byPosition);
    const sets = orderedSets(await setsOf(db, own.map((item) => item.id)));
    if (sets.length > 0) return { session, sets };
  }
  return null;
}

/** The session in progress, if any (the most recent one). */
export async function activeSession(db: LocalDb): Promise<Session | null> {
  const open = await db.sessions.where("status").equals("in_progress").filter(alive).toArray();
  open.sort((a, b) => (b.started_at ?? b.created_at).localeCompare(a.started_at ?? a.created_at));
  return open[0] ?? null;
}

// ---------------------------------------------------------------------------
// Records: every write that touches sets goes through here, so `is_pr` is never stale.

function mergeById<T extends { id: string }>(rows: readonly T[], updates: readonly T[] | undefined): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const row of updates ?? []) byId.set(row.id, row);
  return [...byId.values()];
}

/** Every set of these exercises, in every session that still exists, as it will be after `changes`. */
async function historyAfter(db: LocalDb, exerciseIds: ReadonlySet<string>, changes: Changes): Promise<Map<string, HistorySet[]>> {
  const stored = await db.session_exercises.where("exercise_id").anyOf([...exerciseIds]).toArray();
  const items = mergeById(stored, changes.session_exercises).filter((item) => alive(item) && exerciseIds.has(item.exercise_id));
  const storedSessions = (await db.sessions.bulkGet([...new Set(items.map((item) => item.session_id))])).filter(
    (s): s is Session => !!s,
  );
  const liveSessions = new Set(mergeById(storedSessions, changes.sessions).filter(alive).map((s) => s.id));
  const itemById = new Map(items.filter((item) => liveSessions.has(item.session_id)).map((item) => [item.id, item]));
  const storedSets = await db.session_sets.where("session_exercise_id").anyOf([...itemById.keys()]).toArray();
  const history = new Map<string, HistorySet[]>();
  for (const set of mergeById(storedSets, changes.session_sets)) {
    const item = itemById.get(set.session_exercise_id);
    if (!item) continue;
    history.set(item.exercise_id, [...(history.get(item.exercise_id) ?? []), { set, sessionId: item.session_id }]);
  }
  return history;
}

/** Saves `changes` together with the corrected record flags. Returns the record kinds of each set. */
async function saveWithRecords(
  db: LocalDb,
  changes: Changes,
  exerciseIds: Iterable<string>,
): Promise<Map<string, RecordKind[]>> {
  const ids = new Set(exerciseIds);
  const history = ids.size > 0 ? await historyAfter(db, ids, changes) : new Map<string, HistorySet[]>();
  const records = new Map<string, RecordKind[]>();
  const flags: SessionSet[] = [];
  for (const sets of history.values()) {
    for (const [id, kinds] of findRecords(sets)) records.set(id, kinds);
    flags.push(...staleRecordFlags(sets));
  }
  await saveChanges(db, { ...changes, session_sets: mergeById(changes.session_sets ?? [], flags) });
  return records;
}

// ---------------------------------------------------------------------------
// Session

/** Starts a session for a routine day (its exercises and targets are copied) or an empty one. */
export async function startSession(
  db: LocalDb,
  userId: string,
  day: RoutineDay | null,
  title: string,
): Promise<Session> {
  const items = day ? await db.routine_exercises.where("routine_day_id").equals(day.id).filter(alive).toArray() : [];
  const { session, exercises } = startSessionRows({ userId, day, items, title }, clock());
  await saveChanges(db, { sessions: [session], session_exercises: exercises });
  return session;
}

export async function updateSession(db: LocalDb, session: Session, patch: Partial<Pick<Session, "notes" | "rpe">>): Promise<void> {
  await saveChanges(db, { sessions: [{ ...session, ...patch }] });
}

/** The numbers of a session (live while in progress). */
export async function sessionSummary(db: LocalDb, session: Session): Promise<SessionSummary> {
  const items = await sessionExercises(db, session.id);
  const sets = await setsOf(db, items.map((item) => item.id));
  const history = await historyAfter(db, new Set(items.map((item) => item.exercise_id)), {});
  const own = new Set(sets.map((set) => set.id));
  const records = new Map<string, RecordKind[]>();
  for (const exerciseSets of history.values()) {
    for (const [id, kinds] of findRecords(exerciseSets)) if (own.has(id)) records.set(id, kinds);
  }
  return summarizeSession(session, items, sets, records, new Date().toISOString());
}

/**
 * "Terminar sesión": the single place that closes a session. Exercises you did not do are
 * dropped from it; the summary it returns is what the end screen (and, later, achievements
 * and the image to share) build on.
 */
export async function finishSession(db: LocalDb, session: Session, input: FinishInput): Promise<SessionSummary> {
  const items = await sessionExercises(db, session.id);
  const sets = await setsOf(db, items.map((item) => item.id));
  const now = new Date().toISOString();
  const done = finishSessionRow(session, sets, input, now);
  await saveChanges(db, { sessions: [done], session_exercises: softDeleted(unusedExercises(items, sets), now) });
  return sessionSummary(db, done);
}

/** Deletes the session with everything in it. */
export async function discardSession(db: LocalDb, session: Session): Promise<Undo> {
  const items = await db.session_exercises.where("session_id").equals(session.id).filter(alive).toArray();
  const sets = await setsOf(db, items.map((item) => item.id));
  const now = new Date().toISOString();
  const exerciseIds = items.map((item) => item.exercise_id);
  await saveWithRecords(
    db,
    { sessions: softDeleted([session], now), session_exercises: softDeleted(items, now), session_sets: softDeleted(sets, now) },
    exerciseIds,
  );
  return async () => {
    await saveWithRecords(db, { sessions: [session], session_exercises: items, session_sets: sets }, exerciseIds);
  };
}

// ---------------------------------------------------------------------------
// Exercises of the session

export async function addSessionExercises(db: LocalDb, session: Session, exerciseIds: readonly string[]): Promise<void> {
  const siblings = await sessionExercises(db, session.id);
  const c = clock();
  const added: SessionExercise[] = [];
  for (const exerciseId of exerciseIds) added.push(newSessionExercise(session, [...siblings, ...added], exerciseId, c));
  await saveChanges(db, { session_exercises: added });
}

/** Swaps the exercise for another one (only before logging any set of it). */
export async function swapSessionExercise(db: LocalDb, item: SessionExercise, exerciseId: string): Promise<void> {
  if ((await setsOf(db, [item.id])).length > 0) return;
  await saveChanges(db, { session_exercises: [{ ...item, exercise_id: exerciseId, routine_exercise_id: null }] });
}

export async function updateSessionExercise(
  db: LocalDb,
  item: SessionExercise,
  patch: { notes?: string | null; plannedSets?: number },
): Promise<void> {
  const sets = patch.plannedSets === undefined ? [] : await setsOf(db, [item.id]);
  const next = patch.plannedSets === undefined ? item : withPlannedSets(item, sets, patch.plannedSets);
  await saveChanges(db, { session_exercises: [{ ...next, ...(patch.notes === undefined ? {} : { notes: patch.notes }) }] });
}

export async function removeSessionExercise(db: LocalDb, item: SessionExercise): Promise<Undo> {
  const sets = await setsOf(db, [item.id]);
  const now = new Date().toISOString();
  await saveWithRecords(db, { session_exercises: softDeleted([item], now), session_sets: softDeleted(sets, now) }, [item.exercise_id]);
  return async () => {
    await saveWithRecords(db, { session_exercises: [item], session_sets: sets }, [item.exercise_id]);
  };
}

/** Moves an exercise one place up (-1) or down (+1). */
export async function moveSessionExercise(db: LocalDb, item: SessionExercise, direction: -1 | 1): Promise<void> {
  const items = await sessionExercises(db, item.session_id);
  const from = items.findIndex((other) => other.id === item.id);
  if (from < 0) return;
  await saveChanges(db, { session_exercises: renumber(moveItem(items, from, from + direction)) });
}

// ---------------------------------------------------------------------------
// Sets

/** Logs a set you just did. Returns it with the records it beat (empty if none). */
export async function logSet(
  db: LocalDb,
  item: SessionExercise,
  input: SetInput,
): Promise<{ set: SessionSet; records: RecordKind[] }> {
  const siblings = await db.session_sets.where("session_exercise_id").equals(item.id).toArray();
  const set = newSet(item, siblings, input, clock());
  const records = await saveWithRecords(db, { session_sets: [set] }, [item.exercise_id]);
  return { set, records: records.get(set.id) ?? [] };
}

export async function updateSet(
  db: LocalDb,
  item: SessionExercise,
  set: SessionSet,
  patch: Partial<SetInput>,
): Promise<RecordKind[]> {
  const records = await saveWithRecords(db, { session_sets: [editSet(set, patch)] }, [item.exercise_id]);
  return records.get(set.id) ?? [];
}

export async function deleteSet(db: LocalDb, item: SessionExercise, set: SessionSet): Promise<Undo> {
  await saveWithRecords(db, { session_sets: softDeleted([set], new Date().toISOString()) }, [item.exercise_id]);
  return async () => {
    await saveWithRecords(db, { session_sets: [set] }, [item.exercise_id]);
  };
}
