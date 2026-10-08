import { describe, expect, it } from "vitest";
import { routineDaySchema, routineExerciseSchema, routineSchema } from "../schemas";
import {
  byPosition,
  cleanName,
  convertSchedule,
  duplicateDay,
  duplicateRoutine,
  moveExerciseToDay,
  moveItem,
  newDay,
  newRoutine,
  newRoutineExercise,
  plannedPerWeek,
  renumber,
  reorderByIds,
  rotationLetter,
  rotationOrder,
  targetLabel,
  toggleWeekday,
  weekLayout,
  weekdayOf,
  withTargets,
} from "./builder";
import { day, routine, routineExercise, testClock, USER } from "./test-fixtures";

describe("names and helpers", () => {
  it("cleans names to the database limits and falls back when empty", () => {
    expect(cleanName("  Push   day  ", 60, "x")).toBe("Push day");
    expect(cleanName("   ", 60, "Día A")).toBe("Día A");
    expect(cleanName("a".repeat(100), 60, "x")).toHaveLength(60);
  });

  it("uses Monday = 0", () => {
    expect(weekdayOf(new Date(2026, 9, 5))).toBe(0); // Monday 5 Oct 2026
    expect(weekdayOf(new Date(2026, 9, 11))).toBe(6); // Sunday
  });

  it("names rotation days A, B, C…", () => {
    expect([0, 1, 2, 25, 26].map(rotationLetter)).toEqual(["A", "B", "C", "Z", "27"]);
  });

  it("toggles training weekdays keeping them sorted and unique", () => {
    expect(toggleWeekday([3, 0], 1)).toEqual([0, 1, 3]);
    expect(toggleWeekday([0, 1, 3], 1)).toEqual([0, 3]);
  });
});

describe("ordering", () => {
  it("renumbers 0..n-1 and returns only what changed", () => {
    const items = [
      { id: "a", position: 0 },
      { id: "b", position: 5 },
      { id: "c", position: 2 },
    ];
    expect(renumber(items)).toEqual([{ id: "b", position: 1 }]);
  });

  it("moves an item and keeps the rest in order", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("reorders rows to match a list of ids", () => {
    const rows = [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ];
    expect(reorderByIds(rows, ["c", "a", "b"])).toEqual([
      { id: "c", position: 0 },
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  it("breaks position ties by creation time", () => {
    const a = day({ position: 1, created_at: "2026-01-02T00:00:00Z" });
    const b = day({ position: 1, created_at: "2026-01-01T00:00:00Z" });
    expect([a, b].sort(byPosition)[0]).toBe(b);
  });
});

describe("routines and days", () => {
  it("creates rows the database accepts", () => {
    const clock = testClock();
    const r = newRoutine({ userId: USER, name: "  Fuerza ", scheduleType: "rotation", trainingWeekdays: [4, 0, 4] }, clock);
    expect(routineSchema.parse(r)).toMatchObject({ name: "Fuerza", training_weekdays: [0, 4], schedule_type: "rotation" });

    const gym = newDay(r, [], { kind: "gym", name: "Día A", weekday: 2 }, clock);
    expect(routineDaySchema.parse(gym)).toMatchObject({ weekday: null, position: 0, sport: null });

    const sport = newDay(r, [gym], { kind: "sport", name: "Fútbol", sport: "Fútbol", weekday: 2 }, clock);
    expect(sport).toMatchObject({ kind: "sport", name: "Fútbol", sport: "football", weekday: 2, position: 1 });

    const exercise = newRoutineExercise(gym, [], "cccccccc-0000-4000-8000-000000000009", clock);
    expect(routineExerciseSchema.parse(exercise)).toMatchObject({ target_sets: 3, target_reps_min: 8, target_reps_max: 12 });
  });

  it("keeps the weekday of gym days in weekly routines", () => {
    const gym = newDay(routine(), [], { kind: "gym", name: "Pecho", weekday: 0 }, testClock());
    expect(gym.weekday).toBe(0);
  });

  it("a sport day always has a sport (the database requires it), stored as its code", () => {
    const sport = newDay(routine(), [], { kind: "sport", name: "Pádel", weekday: 3 }, testClock());
    expect(sport).toMatchObject({ name: "Pádel", sport: "padel" });
  });

  it("keeps a sport that is not in the list as typed", () => {
    const sport = newDay(routine(), [], { kind: "sport", name: "", sport: " Surf de remo ", weekday: 3 }, testClock());
    expect(sport).toMatchObject({ name: "Surf de remo", sport: "Surf de remo" });
  });

  it("lays a weekly routine out Monday to Sunday", () => {
    const mon = day({ weekday: 0 });
    const wed = day({ weekday: 2 });
    const loose = day({ weekday: null });
    const { byWeekday, unassigned } = weekLayout([wed, loose, mon]);
    expect(byWeekday[0]).toEqual([mon]);
    expect(byWeekday[2]).toEqual([wed]);
    expect(unassigned).toEqual([loose]);
  });

  it("counts the sessions a week each kind of routine plans", () => {
    expect(plannedPerWeek(routine(), [day({ weekday: 0 }), day({ weekday: 2 }), day({ weekday: null })])).toBe(2);
    const rotation = routine({ schedule_type: "rotation", training_weekdays: [0, 1, 3, 4] });
    expect(plannedPerWeek(rotation, [day(), day(), day({ kind: "sport", sport: "Fútbol", weekday: 2 })])).toBe(5);
  });
});

describe("duplicating", () => {
  it("inserts the copy of a rotation day right after it and shifts the rest", () => {
    const r = routine({ schedule_type: "rotation" });
    const a = day({ position: 0 });
    const b = day({ position: 1 });
    const c = day({ position: 2 });
    const exercises = [routineExercise({ routine_day_id: b.id }), routineExercise({ routine_day_id: b.id, position: 1 })];

    const result = duplicateDay(r, [a, b, c], b, exercises, { name: "B (copia)" }, testClock());

    expect(result.day).toMatchObject({ name: "B (copia)", position: 2 });
    expect(result.days.find((d) => d.id === c.id)?.position).toBe(3);
    expect(result.days.some((d) => d.id === a.id)).toBe(false);
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises.every((e) => e.routine_day_id === result.day.id)).toBe(true);
    expect(result.exercises.every((e) => !exercises.some((original) => original.id === e.id))).toBe(true);
  });

  it("puts the copy of a weekly day on the chosen weekday", () => {
    const mon = day({ weekday: 0 });
    const result = duplicateDay(routine(), [mon], mon, [], { name: "Copia", weekday: 3 }, testClock());
    expect(result.day.weekday).toBe(3);
  });

  it("deep-copies a routine with new ids and links", () => {
    const r = routine();
    const d = day({ routine_id: r.id });
    const e = routineExercise({ routine_day_id: d.id });
    const copy = duplicateRoutine(r, [d], [e], "Copia", testClock());
    expect(copy.routine.id).not.toBe(r.id);
    expect(copy.days[0]?.routine_id).toBe(copy.routine.id);
    expect(copy.exercises[0]?.routine_day_id).toBe(copy.days[0]?.id);
    expect(copy.exercises[0]?.exercise_id).toBe(e.exercise_id);
  });
});

describe("switching schedule type", () => {
  it("weekly → rotation keeps the order and learns the training days", () => {
    const r = routine();
    const thu = day({ weekday: 3, position: 0 });
    const mon = day({ weekday: 0, position: 1 });
    const football = day({ kind: "sport", sport: "Fútbol", weekday: 2 });
    const result = convertSchedule(r, [thu, mon, football], "rotation");

    expect(result.routine).toMatchObject({ schedule_type: "rotation", training_weekdays: [0, 3] });
    const updated = new Map(result.days.map((d) => [d.id, d]));
    expect(updated.get(mon.id)).toMatchObject({ position: 0, weekday: null });
    expect(updated.get(thu.id)).toMatchObject({ position: 1, weekday: null });
    expect(updated.has(football.id)).toBe(false); // sport stays pinned
  });

  it("rotation → weekly assigns the training days in order and leaves the rest unassigned", () => {
    const r = routine({ schedule_type: "rotation", training_weekdays: [1, 4] });
    const a = day({ position: 0 });
    const b = day({ position: 1 });
    const c = day({ position: 2 });
    const result = convertSchedule(r, [c, a, b], "weekly");
    const updated = new Map(result.days.map((d) => [d.id, d]));
    expect(result.routine.schedule_type).toBe("weekly");
    expect(updated.get(a.id)?.weekday).toBe(1);
    expect(updated.get(b.id)?.weekday).toBe(4);
    expect(updated.has(c.id)).toBe(false); // already null: nothing to save, shows as unassigned
    expect(weekLayout([{ ...a, weekday: 1 }, { ...b, weekday: 4 }, c]).unassigned).toEqual([c]);
  });

  it("does nothing when the type does not change", () => {
    const r = routine();
    expect(convertSchedule(r, [day({ weekday: 0 })], "weekly")).toEqual({ routine: r, days: [] });
  });
});

describe("targets", () => {
  const base = routineExercise();

  it("clamps to the database limits", () => {
    expect(withTargets(base, { target_sets: 0 }).target_sets).toBe(1);
    expect(withTargets(base, { target_sets: 99 }).target_sets).toBe(20);
    expect(withTargets(base, { target_reps_min: 500 }).target_reps_min).toBe(100);
  });

  it("raising the minimum above the maximum pushes the maximum up (then it is fixed reps)", () => {
    expect(withTargets(base, { target_reps_min: 15 })).toMatchObject({ target_reps_min: 15, target_reps_max: null });
  });

  it("lowering the maximum below the minimum pulls the minimum down", () => {
    expect(withTargets(base, { target_reps_max: 5 })).toMatchObject({ target_reps_min: 5, target_reps_max: null });
  });

  it("supports fixed reps and ranges", () => {
    expect(withTargets(base, { target_reps_max: null })).toMatchObject({ target_reps_min: 8, target_reps_max: null });
    expect(withTargets({ ...base, target_reps_max: null }, { target_reps_max: 10 })).toMatchObject({
      target_reps_min: 8,
      target_reps_max: 10,
    });
  });

  it("formats sets × reps", () => {
    expect(targetLabel(base)).toBe("3 × 8–12");
    expect(targetLabel({ ...base, target_sets: 5, target_reps_min: 5, target_reps_max: null })).toBe("5 × 5");
  });
});

describe("moving exercises between days", () => {
  it("appends to the target day and closes the gap in the source", () => {
    const from = [
      routineExercise({ position: 0 }),
      routineExercise({ position: 1 }),
      routineExercise({ position: 2 }),
    ];
    const target = day({ id: "dddddddd-0000-4000-8000-000000000999" });
    const already = [routineExercise({ routine_day_id: target.id, position: 0 })];
    const [moved, ...rest] = moveExerciseToDay(from[0]!, from, target, already);
    expect(moved).toMatchObject({ routine_day_id: target.id, position: 1 });
    expect(rest.map((e) => e.position)).toEqual([0, 1]);
  });
});

describe("rotation order", () => {
  it("only gym days, by position", () => {
    const b = day({ position: 1 });
    const a = day({ position: 0 });
    const sport = day({ kind: "sport", sport: "Pádel", position: 2 });
    expect(rotationOrder([b, sport, a])).toEqual([a, b]);
  });
});
