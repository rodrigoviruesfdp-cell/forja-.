import { describe, expect, it } from "vitest";
import { day, NOW, routineExercise, testClock, USER } from "../routines/test-fixtures";
import { sessionExerciseSchema, sessionSchema, sessionSetSchema } from "../schemas";
import {
  copyLastTime,
  durationMinutes,
  editSet,
  finishSession,
  localDate,
  newSessionExercise,
  newSet,
  pendingSets,
  sessionEnd,
  startSession,
  stepWeight,
  suggestSets,
  summarizeSession,
  unusedExercises,
  withPlannedSets,
} from "./session";
import { session, sessionExercise, set } from "./test-fixtures";

const minutes = (n: number) => new Date(Date.parse(NOW) + n * 60_000).toISOString();

describe("startSession", () => {
  it("copies the day's exercises and targets, in order", () => {
    const gym = day({ name: "B · Espalda" });
    const items = [
      routineExercise({ routine_day_id: gym.id, position: 1, target_sets: 4, target_reps_min: 6, target_reps_max: 8 }),
      routineExercise({ routine_day_id: gym.id, position: 0, notes: "Agarre ancho" }),
      routineExercise({ routine_day_id: gym.id, position: 2, deleted_at: NOW }),
    ];
    const { session: row, exercises } = startSession({ userId: USER, day: gym, items, title: gym.name }, testClock());
    expect(sessionSchema.parse(row)).toMatchObject({
      status: "in_progress",
      kind: "gym",
      routine_day_id: gym.id,
      title: "B · Espalda",
      started_at: NOW,
      date: localDate(new Date(NOW)),
    });
    expect(exercises.map((e) => sessionExerciseSchema.parse(e))).toHaveLength(2);
    expect(exercises.map((e) => [e.routine_exercise_id, e.position, e.target_sets, e.notes])).toEqual([
      [items[1]?.id, 0, 3, "Agarre ancho"],
      [items[0]?.id, 1, 4, null],
    ]);
  });

  it("a free session starts empty", () => {
    const { session: row, exercises } = startSession({ userId: USER, day: null, items: [], title: "Entreno libre" }, testClock());
    expect(row.routine_day_id).toBeNull();
    expect(exercises).toEqual([]);
  });

  it("an exercise added on the fly goes last with the default target", () => {
    const s = session();
    const added = newSessionExercise(s, [sessionExercise({ position: 0 }), sessionExercise({ position: 1 })], "ex", testClock());
    expect(added).toMatchObject({ position: 2, target_sets: 3, target_reps_min: 8, target_reps_max: 12, routine_exercise_id: null });
  });
});

describe("sets", () => {
  it("a new set is numbered after the others and cleaned to the database limits", () => {
    const item = sessionExercise();
    const done = newSet(item, [set(60, 10, { set_number: 1 }), set(60, 10, { set_number: 2 })], { weightKg: 62.5004, reps: 8.4, isWarmup: false }, testClock());
    expect(sessionSetSchema.parse(done)).toMatchObject({ set_number: 3, weight_kg: 62.5, reps: 8, completed_at: NOW, is_pr: false });
    expect(newSet(item, [], { weightKg: -5, reps: 5000, isWarmup: true }, testClock())).toMatchObject({ weight_kg: 0, reps: 1000, is_warmup: true });
  });

  it("edits keep what is not changed", () => {
    expect(editSet(set(60, 10), { reps: 9 })).toMatchObject({ weight_kg: 60, reps: 9, is_warmup: false });
  });

  it("warm-ups do not count against the planned sets", () => {
    const item = sessionExercise({ target_sets: 3 });
    expect(pendingSets(item, [set(40, 10, { is_warmup: true }), set(60, 10)])).toBe(2);
    expect(pendingSets(item, [set(60, 10), set(60, 10), set(60, 10), set(60, 8)])).toBe(0);
  });

  it("planned sets never drop below what you already did", () => {
    const item = sessionExercise({ target_sets: 3 });
    expect(withPlannedSets(item, [set(60, 10), set(60, 10)], 1).target_sets).toBe(2);
    expect(withPlannedSets(item, [], 4).target_sets).toBe(4);
    expect(withPlannedSets(item, [], 0).target_sets).toBe(1);
  });

  it("weight buttons step by 2.5 kg or 5 lb, never below zero", () => {
    expect(stepWeight(60, "kg", 1)).toBe(62.5);
    expect(stepWeight(1, "kg", -1)).toBe(0);
    // 135 lb + 5 lb = 140 lb, stored in kg.
    expect(stepWeight(61.235, "lb", 1)).toBeCloseTo(63.503, 3);
  });
});

describe("suggestSets", () => {
  const item = sessionExercise({ target_reps_min: 8 });
  const lastTime = [set(60, 10, { set_number: 1 }), set(62.5, 8, { set_number: 2 }), set(65, 6, { set_number: 3 })];

  it("first time: no weight and the low end of the target", () => {
    expect(suggestSets(item, [], null, 2)).toEqual([
      { weightKg: null, reps: 8 },
      { weightKg: null, reps: 8 },
    ]);
  });

  it("follows last time while you repeat it (pyramids too)", () => {
    expect(suggestSets(item, [], lastTime, 3).map((s) => s.weightKg)).toEqual([60, 62.5, 65]);
    expect(suggestSets(item, [set(60, 10, { set_number: 1 })], lastTime, 2).map((s) => s.weightKg)).toEqual([62.5, 65]);
  });

  it("once you change something, your last set carries forward", () => {
    expect(suggestSets(item, [set(65, 10, { set_number: 1 })], lastTime, 2)).toEqual([
      { weightKg: 65, reps: 10 },
      { weightKg: 65, reps: 10 },
    ]);
  });

  it("ignores warm-ups on both sides", () => {
    const done = [set(40, 10, { set_number: 1, is_warmup: true })];
    expect(suggestSets(item, done, lastTime, 1)[0]?.weightKg).toBe(60);
  });

  it("past the end of last time, repeats your last set", () => {
    const done = lastTime.map((s, i) => ({ ...s, id: `done-${i}` }));
    expect(suggestSets(item, done, lastTime, 1)).toEqual([{ weightKg: 65, reps: 6 }]);
  });

  it("copy last time fills the remaining rows from last time", () => {
    expect(copyLastTime([set(70, 3, { set_number: 1 })], lastTime, 2).map((s) => s.weightKg)).toEqual([62.5, 65]);
  });
});

describe("finishing", () => {
  it("ends now, or at the last set if you forgot to finish", () => {
    expect(sessionEnd(minutes(50), minutes(55))).toBe(minutes(55));
    expect(sessionEnd(minutes(50), minutes(200))).toBe(minutes(50));
    expect(sessionEnd(null, minutes(5))).toBe(minutes(5));
    expect(durationMinutes(NOW, minutes(52))).toBe(52);
  });

  it("closes the session with duration, RPE and notes", () => {
    const s = session({ started_at: NOW });
    const done = finishSession(s, [set(60, 10, { at: 40 })], { rpe: 8, notes: "  Bien  " }, minutes(45));
    expect(sessionSchema.parse(done)).toMatchObject({ status: "completed", ended_at: minutes(45), duration_min: 45, rpe: 8, notes: "Bien" });
    expect(finishSession(s, [], { rpe: 14, notes: " " }, minutes(5))).toMatchObject({ rpe: 10, notes: null });
  });

  it("exercises you did not do are left out of the history", () => {
    const used = sessionExercise();
    const skipped = sessionExercise();
    expect(unusedExercises([used, skipped], [set(60, 10, { session_exercise_id: used.id })])).toEqual([skipped]);
  });

  it("sums up work sets, volume and the best record per exercise", () => {
    const s = session({ started_at: NOW });
    const bench = sessionExercise({ position: 0, exercise_id: "bench" });
    const row = sessionExercise({ position: 1, exercise_id: "row" });
    const unused = sessionExercise({ position: 2, exercise_id: "curl" });
    const warm = set(40, 10, { session_exercise_id: bench.id, is_warmup: true, at: 1 });
    const pr1 = set(62.5, 8, { session_exercise_id: bench.id, at: 5 });
    const pr2 = set(65, 8, { session_exercise_id: bench.id, at: 10 });
    const rowSet = set(50, 10, { session_exercise_id: row.id, at: 20 });
    const records = new Map([
      [pr1.id, ["weight" as const]],
      [pr2.id, ["weight" as const, "e1rm" as const]],
    ]);
    const summary = summarizeSession(s, [bench, row, unused], [warm, pr1, pr2, rowSet], records, minutes(30));
    expect(summary).toMatchObject({ durationMin: 30, exercises: 2, workSets: 3, volumeKg: 62.5 * 8 + 65 * 8 + 500 });
    expect(summary.records).toHaveLength(1);
    expect(summary.records[0]).toMatchObject({ exerciseId: "bench", weightKg: 65, reps: 8, kinds: ["weight", "e1rm"] });
  });
});
