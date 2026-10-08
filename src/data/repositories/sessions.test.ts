import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalDb } from "@/data/local/db";
import type { RoutineDay, RoutineExercise } from "@/domain/schemas";
import {
  activeSession,
  addSessionExercises,
  deleteSet,
  discardSession,
  finishSession,
  lastPerformance,
  logSet,
  deleteSession,
  removeSessionExercise,
  saveSportSession,
  sessionExercises,
  setsOf,
  skipPlannedDay,
  startSession,
  updateSet,
} from "./sessions";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-10-07T10:00:00.000Z";
const BENCH = "cccccccc-0000-4000-8000-000000000001";
const ROW = "cccccccc-0000-4000-8000-000000000002";

const gymDay: RoutineDay = {
  id: "dddddddd-0000-4000-8000-000000000001",
  user_id: USER,
  routine_id: "aaaaaaaa-0000-4000-8000-000000000001",
  name: "A · Pecho",
  kind: "gym",
  sport: null,
  weekday: null,
  position: 0,
  notes: null,
  created_at: NOW,
  updated_at: NOW,
  deleted_at: null,
};

function planned(exerciseId: string, position: number): RoutineExercise {
  return {
    id: `eeeeeeee-0000-4000-8000-00000000000${position + 1}`,
    user_id: USER,
    routine_day_id: gymDay.id,
    exercise_id: exerciseId,
    position,
    target_sets: 3,
    target_reps_min: 8,
    target_reps_max: 12,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
  };
}

/** Moves the phone's clock (sets are ordered by the time they were done). */
function at(minutes: number) {
  vi.setSystemTime(new Date(Date.parse(NOW) + minutes * 60_000));
}

describe("sessions repository", () => {
  let db: LocalDb;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    at(0);
    db = new LocalDb(`sessions-test-${crypto.randomUUID()}`);
    await db.routine_exercises.bulkPut([planned(BENCH, 0), planned(ROW, 1)]);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await db.delete();
  });

  async function benchOf(sessionId: string) {
    const item = (await sessionExercises(db, sessionId)).find((i) => i.exercise_id === BENCH);
    if (!item) throw new Error("bench missing");
    return item;
  }

  it("starts a session with a copy of the day's exercises, queued for upload", async () => {
    const session = await startSession(db, USER, gymDay, gymDay.name);
    expect(session).toMatchObject({ status: "in_progress", routine_day_id: gymDay.id, title: "A · Pecho" });
    expect((await sessionExercises(db, session.id)).map((i) => i.exercise_id)).toEqual([BENCH, ROW]);
    expect(await db.outbox.count()).toBe(3);
    expect((await activeSession(db))?.id).toBe(session.id);
  });

  it("detects records against earlier sessions and keeps the flags right after edits", async () => {
    const first = await startSession(db, USER, gymDay, gymDay.name);
    at(5);
    const firstSet = await logSet(db, await benchOf(first.id), { weightKg: 60, reps: 10, isWarmup: false });
    expect(firstSet.records).toEqual([]);
    at(50);
    await finishSession(db, first, { rpe: 8, notes: null });

    at(60 * 48);
    const second = await startSession(db, USER, gymDay, gymDay.name);
    const bench = await benchOf(second.id);
    at(60 * 48 + 5);
    const warmup = await logSet(db, bench, { weightKg: 70, reps: 5, isWarmup: true });
    expect(warmup.records).toEqual([]);
    at(60 * 48 + 8);
    const heavy = await logSet(db, bench, { weightKg: 65, reps: 8, isWarmup: false });
    expect(heavy.records).toEqual(["weight", "e1rm"]);
    expect((await db.session_sets.get(heavy.set.id))?.is_pr).toBe(true);

    // Correcting the set to below the old best removes the record.
    expect(await updateSet(db, bench, heavy.set, { weightKg: 55 })).toEqual([]);
    expect((await db.session_sets.get(heavy.set.id))?.is_pr).toBe(false);

    // Deleting the old best makes today's set the new reference… but there is no earlier
    // session left to beat, so it is not a record either.
    const firstBench = await benchOf(first.id);
    const undo = await deleteSet(db, firstBench, firstSet.set);
    expect((await db.session_sets.get(heavy.set.id))?.is_pr).toBe(false);
    await undo();
    expect((await db.session_sets.get(firstSet.set.id))?.deleted_at).toBeNull();
  });

  it("shows what you did last time, not counting the session in progress", async () => {
    const first = await startSession(db, USER, gymDay, gymDay.name);
    at(5);
    await logSet(db, await benchOf(first.id), { weightKg: 60, reps: 10, isWarmup: false });
    at(6);
    await logSet(db, await benchOf(first.id), { weightKg: 62.5, reps: 8, isWarmup: false });
    expect(await lastPerformance(db, BENCH, null)).toBeNull();
    at(50);
    await finishSession(db, first, { rpe: null, notes: null });

    const second = await startSession(db, USER, gymDay, gymDay.name);
    at(60 * 24);
    await logSet(db, await benchOf(second.id), { weightKg: 70, reps: 3, isWarmup: false });
    const last = await lastPerformance(db, BENCH, second.id);
    expect(last?.session.id).toBe(first.id);
    expect(last?.sets.map((s) => [s.weight_kg, s.reps])).toEqual([
      [60, 10],
      [62.5, 8],
    ]);
  });

  it("finishing drops the exercises you did not do and sums up the session", async () => {
    const session = await startSession(db, USER, gymDay, gymDay.name);
    at(3);
    await logSet(db, await benchOf(session.id), { weightKg: 40, reps: 10, isWarmup: true });
    at(6);
    await logSet(db, await benchOf(session.id), { weightKg: 60, reps: 10, isWarmup: false });
    at(9);
    await logSet(db, await benchOf(session.id), { weightKg: 60, reps: 9, isWarmup: false });
    await addSessionExercises(db, session, [ROW]);
    at(30);

    const summary = await finishSession(db, session, { rpe: 7, notes: " Buen día " });
    expect(summary).toMatchObject({ durationMin: 30, exercises: 1, workSets: 2, volumeKg: 1140, records: [] });
    expect(await db.sessions.get(session.id)).toMatchObject({ status: "completed", rpe: 7, notes: "Buen día", duration_min: 30 });
    expect((await sessionExercises(db, session.id)).map((i) => i.exercise_id)).toEqual([BENCH]);
    expect(await activeSession(db)).toBeNull();
  });

  it("discarding a session removes everything in it, and undo brings it back", async () => {
    const session = await startSession(db, USER, gymDay, gymDay.name);
    at(4);
    await logSet(db, await benchOf(session.id), { weightKg: 60, reps: 10, isWarmup: false });

    const undo = await discardSession(db, session);
    expect((await db.sessions.get(session.id))?.deleted_at).not.toBeNull();
    expect(await sessionExercises(db, session.id)).toEqual([]);
    await undo();
    const items = await sessionExercises(db, session.id);
    expect(items).toHaveLength(2);
    expect(await setsOf(db, items.map((i) => i.id))).toHaveLength(1);
  });

  it("removing an exercise takes its sets with it", async () => {
    const session = await startSession(db, USER, gymDay, gymDay.name);
    const bench = await benchOf(session.id);
    at(4);
    await logSet(db, bench, { weightKg: 60, reps: 10, isWarmup: false });
    const undo = await removeSessionExercise(db, bench);
    expect(await setsOf(db, [bench.id])).toEqual([]);
    await undo();
    expect(await setsOf(db, [bench.id])).toHaveLength(1);
  });

  const surfInput = {
    sport: "surf",
    date: "2026-10-05",
    durationMin: 120,
    rpe: 7,
    distanceKm: null,
    metrics: { waves: 14 },
    notes: null,
    routineDayId: null,
    title: "Surf",
  };

  it("logs a sport with a new spot in one go, and reuses the spot by name next time", async () => {
    const first = await saveSportSession(db, USER, surfInput, { newName: "Zurriola" }, null);
    const places = await db.places.toArray();
    expect(places.map((p) => [p.name, p.sport])).toEqual([["Zurriola", "surf"]]);
    expect(first).toMatchObject({ kind: "sport", status: "completed", place_id: places[0]?.id, metrics: { waves: 14 } });
    expect(await db.outbox.where("table").equals("places").count()).toBe(1);

    const second = await saveSportSession(db, USER, { ...surfInput, date: "2026-10-06" }, { newName: " zurriola " }, null);
    expect(await db.places.count()).toBe(1);
    expect(second.place_id).toBe(first.place_id);

    const edited = await saveSportSession(db, USER, { ...surfInput, durationMin: 90 }, null, first);
    expect(edited).toMatchObject({ id: first.id, duration_min: 90, place_id: null });
  });

  it("skips a planned day and undo brings it back to planned", async () => {
    const undo = await skipPlannedDay(db, USER, gymDay, "2026-10-08");
    const skipped = await db.sessions.where("date").equals("2026-10-08").toArray();
    expect(skipped.map((s) => [s.status, s.routine_day_id])).toEqual([["skipped", gymDay.id]]);
    await undo();
    expect((await db.sessions.where("date").equals("2026-10-08").toArray())[0]?.deleted_at).not.toBeNull();
  });

  it("deletes a sport session with undo", async () => {
    const surf = await saveSportSession(db, USER, surfInput, null, null);
    const undo = await deleteSession(db, surf);
    expect((await db.sessions.get(surf.id))?.deleted_at).not.toBeNull();
    await undo();
    expect((await db.sessions.get(surf.id))?.deleted_at).toBeNull();
  });
});
