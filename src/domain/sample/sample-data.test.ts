import { describe, expect, it } from "vitest";
import { addDays, mondayOf } from "../dates";
import { rotationOrder } from "../routines/builder";
import { planForDate } from "../routines/plan";
import { templateSourceIds } from "../routines/templates";
import {
  bodyMetricSchema,
  placeSchema,
  routineDaySchema,
  routineExerciseSchema,
  routineSchema,
  sessionExerciseSchema,
  sessionSchema,
  sessionSetSchema,
} from "../schemas";
import { weeklyStreak } from "../streak";
import { fromKg, type WeightUnit } from "../units";
import { buildSampleData, SAMPLE_SPOTS, type SampleInput } from "./sample-data";

const USER = "11111111-1111-4111-8111-111111111111";
const TODAY = "2026-10-09"; // a Friday
const catalog = new Map(templateSourceIds().map((source, i) => [source, `cccccccc-0000-4000-8000-${String(i).padStart(12, "0")}`]));
const sourceOf = new Map([...catalog].map(([source, id]) => [id, source]));

function input(patch: Partial<SampleInput> = {}): SampleInput {
  let next = 1;
  return {
    userId: USER,
    today: TODAY,
    exerciseIdBySource: catalog,
    names: { routine: "Rutina de ejemplo", day: (key) => key },
    sportName: (sport) => `sport:${sport}`,
    unit: "kg",
    newId: () => `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`,
    ...patch,
  };
}

const sample = buildSampleData(input());
const completed = sample.sessions.filter((s) => s.status === "completed");
const gym = completed.filter((s) => s.kind === "gym");

/** Best weight of an exercise in the sessions of a date range. */
function bestKg(source: string, from: string, to: string): number {
  const exercise = catalog.get(source);
  const sessions = new Set(gym.filter((s) => s.date >= from && s.date <= to).map((s) => s.id));
  const items = new Set(sample.session_exercises.filter((i) => i.exercise_id === exercise && sessions.has(i.session_id)).map((i) => i.id));
  return Math.max(0, ...sample.session_sets.filter((set) => items.has(set.session_exercise_id) && !set.is_warmup).map((set) => set.weight_kg));
}

describe("sample data", () => {
  it("is the same every time", () => {
    expect(buildSampleData(input())).toEqual(sample);
  });

  it("builds rows the database accepts, all for the user", () => {
    sample.routines.forEach((row) => routineSchema.parse(row));
    sample.routine_days.forEach((row) => routineDaySchema.parse(row));
    sample.routine_exercises.forEach((row) => routineExerciseSchema.parse(row));
    sample.places.forEach((row) => placeSchema.parse(row));
    sample.sessions.forEach((row) => sessionSchema.parse(row));
    sample.session_exercises.forEach((row) => sessionExerciseSchema.parse(row));
    sample.session_sets.forEach((row) => sessionSetSchema.parse(row));
    sample.body_metrics.forEach((row) => bodyMetricSchema.parse(row));
    const all = [...sample.sessions, ...sample.session_sets, ...sample.places, ...sample.body_metrics, ...sample.routines];
    expect(all.every((row) => row.user_id === USER)).toBe(true);
    const ids = Object.values(sample).flat().map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers twelve weeks up to yesterday, with nothing in progress", () => {
    const dates = sample.sessions.map((s) => s.date).sort();
    expect(dates[0]).toBe(mondayOf(addDays(TODAY, -84)));
    expect(dates.at(-1)).toBe(addDays(TODAY, -1));
    expect(sample.sessions.some((s) => s.status === "in_progress")).toBe(false);
    expect(gym.length).toBeGreaterThan(36);
    expect(gym.every((s) => s.duration_min !== null && s.duration_min > 20 && s.started_at && s.ended_at)).toBe(true);
  });

  it("follows the A/B/C/D rotation; a skipped day stays the next one", () => {
    const order = rotationOrder(sample.routine_days).map((d) => d.id);
    const done = gym.sort((a, b) => a.date.localeCompare(b.date)).map((s) => s.routine_day_id);
    done.forEach((dayId, i) => expect(dayId).toBe(order[i % order.length]));
    expect(sample.sessions.some((s) => s.status === "skipped")).toBe(true);
  });

  it("gets stronger: double progression with records along the way", () => {
    const firstWeeks = [mondayOf(addDays(TODAY, -84)), addDays(TODAY, -70)] as const;
    const lastWeeks = [addDays(TODAY, -14), TODAY] as const;
    for (const lift of ["Barbell_Bench_Press_-_Medium_Grip", "Barbell_Squat", "Standing_Military_Press"]) {
      expect(bestKg(lift, ...lastWeeks)).toBeGreaterThan(bestKg(lift, ...firstWeeks));
    }
    expect(sample.session_sets.filter((set) => set.is_pr).length).toBeGreaterThan(20);
    // The first time you do an exercise is the baseline, never a record.
    const firstSession = gym[0];
    const items = new Set(sample.session_exercises.filter((i) => i.session_id === firstSession?.id).map((i) => i.id));
    expect(sample.session_sets.some((set) => items.has(set.session_exercise_id) && set.is_pr)).toBe(false);
    // Pull-ups are done with bodyweight; their records are reps.
    const pullups = sample.session_exercises.filter((i) => sourceOf.get(i.exercise_id) === "Pullups").map((i) => i.id);
    const pullupSets = sample.session_sets.filter((set) => pullups.includes(set.session_exercise_id));
    expect(pullupSets.every((set) => set.weight_kg === 0)).toBe(true);
    expect(Math.max(...pullupSets.map((s) => s.reps))).toBeGreaterThan(Math.min(...pullupSets.map((s) => s.reps)));
  });

  it("uses round loads in the unit you read", () => {
    const loads = (unit: WeightUnit) =>
      buildSampleData(input({ unit }))
        .session_sets.filter((set) => set.weight_kg > 0)
        .map((set) => fromKg(set.weight_kg, unit));
    expect(loads("lb").every((lb) => lb % 5 === 0)).toBe(true);
    expect(loads("kg").every((kg) => Number.isInteger(kg * 2))).toBe(true);
  });

  it("adds football, surf at two spots and runs, and a weekly weigh-in going down", () => {
    const sports = completed.filter((s) => s.kind === "sport");
    const football = sports.filter((s) => s.sport === "football");
    expect(football.length).toBeGreaterThan(8);
    expect(football.every((s) => s.routine_day_id === sample.routine_days.find((d) => d.kind === "sport")?.id)).toBe(true);
    const surf = sports.filter((s) => s.sport === "surf");
    expect(new Set(surf.map((s) => s.place_id))).toEqual(new Set(sample.places.map((p) => p.id)));
    expect(sample.places.map((p) => p.name)).toEqual([...SAMPLE_SPOTS]);
    expect(surf.every((s) => (s.metrics.waves ?? 0) > 0 && s.title === "sport:surf")).toBe(true);
    const runs = sports.filter((s) => s.sport === "running");
    expect(runs.length).toBeGreaterThan(2);
    expect(runs.every((s) => (s.distance_km ?? 0) >= 6)).toBe(true);
    const weights = sample.body_metrics.map((m) => m.body_weight_kg ?? 0);
    expect(weights.length).toBe(13);
    expect(weights[0]).toBeGreaterThan(weights.at(-1) ?? 0);
  });

  it("opens with a plan for today and a live streak", () => {
    const routine = sample.routines[0];
    if (!routine) throw new Error("no routine");
    const lastGym = gym.sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    const plan = planForDate(routine, sample.routine_days, new Date(2026, 9, 9, 12), lastGym?.routine_day_id ?? null);
    expect(plan.today.map((d) => d.kind)).toEqual(["gym"]); // Friday is a training day
    expect(weeklyStreak(sample.sessions, 5, TODAY).current).toBeGreaterThanOrEqual(1);
  });
});
