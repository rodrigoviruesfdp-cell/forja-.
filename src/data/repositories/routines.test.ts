import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "@/data/local/db";
import { TEMPLATES } from "@/domain/routines/templates";
import type { Exercise, Profile } from "@/domain/schemas";
import {
  addDay,
  addExercises,
  changeScheduleType,
  copyDay,
  createFromTemplate,
  createRoutine,
  dayExercises,
  deleteRoutine,
  moveExercise,
  reorderExercises,
  restore,
  routineDays,
} from "./routines";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-10-07T10:00:00.000Z";

const profile: Profile = {
  id: USER,
  display_name: "Yo",
  goal: null,
  level: null,
  units: "kg",
  locale: "es",
  injury_notes: null,
  active_routine_id: null,
  username: null,
  bio: null,
  avatar_url: null,
  is_private: true,
  created_at: NOW,
  updated_at: NOW,
};

function catalogExercise(sourceId: string, index: number): Exercise {
  return {
    id: `cccccccc-0000-4000-8000-${String(index).padStart(12, "0")}`,
    created_by: null,
    source_id: sourceId,
    name: sourceId,
    translations: {},
    primary_muscle: "chest",
    secondary_muscles: [],
    equipment: null,
    category: "strength",
    mechanic: null,
    instructions: [],
    image_urls: [],
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
  };
}

describe("routines repository", () => {
  let db: LocalDb;

  beforeEach(async () => {
    db = new LocalDb(`routines-test-${crypto.randomUUID()}`);
    await db.profiles.put(profile);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("the first routine becomes the active one, in the same transaction", async () => {
    const routine = await createRoutine(db, profile, { name: "Fuerza", scheduleType: "weekly" });
    expect((await db.profiles.get(USER))?.active_routine_id).toBe(routine.id);
    expect(await db.outbox.where("table").anyOf(["routines", "profiles"]).count()).toBe(2);

    await createRoutine(db, { ...profile, active_routine_id: routine.id }, { name: "Otra", scheduleType: "rotation" });
    expect((await db.profiles.get(USER))?.active_routine_id).toBe(routine.id);
  });

  it("builds a template with the exercises found on the device", async () => {
    await db.exercises.bulkPut([catalogExercise("Barbell_Squat", 1), catalogExercise("Pullups", 2)]);
    const routine = await createFromTemplate(db, profile, TEMPLATES.abcdSport, {
      routine: "A/B/C/D",
      day: (key) => key,
    });
    const days = await routineDays(db, routine.id);
    const exercises = await dayExercises(db, days.map((d) => d.id));
    expect(days).toHaveLength(5);
    expect(exercises.map((e) => e.exercise_id).sort()).toEqual([
      "cccccccc-0000-4000-8000-000000000001",
      "cccccccc-0000-4000-8000-000000000002",
    ]);
  });

  it("deletes a routine with everything in it and undo brings it all back", async () => {
    const routine = await createRoutine(db, profile, { name: "Fuerza", scheduleType: "weekly" });
    const active = { ...profile, active_routine_id: routine.id };
    const day = await addDay(db, routine, { kind: "gym", name: "Pecho", weekday: 0 });
    await addExercises(db, day, ["cccccccc-0000-4000-8000-000000000001"]);

    const undo = await deleteRoutine(db, active, routine);
    expect((await db.routines.get(routine.id))?.deleted_at).not.toBeNull();
    expect(await routineDays(db, routine.id)).toEqual([]);
    expect((await db.profiles.get(USER))?.active_routine_id).toBeNull();

    await restore(db, undo);
    expect((await db.routines.get(routine.id))?.deleted_at).toBeNull();
    expect(await dayExercises(db, [day.id])).toHaveLength(1);
    expect((await db.profiles.get(USER))?.active_routine_id).toBe(routine.id);
  });

  it("reorders exercises and moves one to another day", async () => {
    const routine = await createRoutine(db, profile, { name: "R", scheduleType: "rotation" });
    const a = await addDay(db, routine, { kind: "gym", name: "A" });
    const b = await addDay(db, routine, { kind: "gym", name: "B" });
    await addExercises(db, a, [
      "cccccccc-0000-4000-8000-000000000001",
      "cccccccc-0000-4000-8000-000000000002",
      "cccccccc-0000-4000-8000-000000000003",
    ]);
    const [first, second, third] = (await dayExercises(db, [a.id])).sort((x, y) => x.position - y.position);

    await reorderExercises(db, a.id, [third!.id, first!.id, second!.id]);
    const reordered = (await dayExercises(db, [a.id])).sort((x, y) => x.position - y.position);
    expect(reordered.map((e) => e.id)).toEqual([third!.id, first!.id, second!.id]);

    await moveExercise(db, reordered[0]!, b);
    expect((await dayExercises(db, [b.id])).map((e) => e.id)).toEqual([third!.id]);
    expect((await dayExercises(db, [a.id])).map((e) => e.position).sort()).toEqual([0, 1]);
  });

  it("duplicates a day with its exercises and converts the schedule", async () => {
    const routine = await createRoutine(db, profile, { name: "R", scheduleType: "weekly" });
    const mon = await addDay(db, routine, { kind: "gym", name: "Lunes", weekday: 0 });
    await addExercises(db, mon, ["cccccccc-0000-4000-8000-000000000001"]);

    const copy = await copyDay(db, routine, mon, { name: "Jueves", weekday: 3 });
    expect(copy.weekday).toBe(3);
    expect(await dayExercises(db, [copy.id])).toHaveLength(1);

    await changeScheduleType(db, routine, "rotation");
    expect((await db.routines.get(routine.id))?.training_weekdays).toEqual([0, 3]);
    expect((await routineDays(db, routine.id)).every((d) => d.weekday === null)).toBe(true);
  });
});
