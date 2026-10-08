import { describe, expect, it } from "vitest";
import { nextRotationDay, planForDate, weekStrip } from "./plan";
import { day, routine } from "./test-fixtures";

// Monday 5 October 2026 … Sunday 11 October 2026.
const MONDAY = new Date(2026, 9, 5);
const TUESDAY = new Date(2026, 9, 6);
const WEDNESDAY = new Date(2026, 9, 7);
const SATURDAY = new Date(2026, 9, 10);

describe("weekly routine", () => {
  const r = routine();
  const push = day({ name: "Push", weekday: 0 });
  const football = day({ name: "Fútbol", kind: "sport", sport: "Fútbol", weekday: 0 });
  const pull = day({ name: "Pull", weekday: 2 });
  const days = [football, pull, push];

  it("lists what is on today, gym first", () => {
    expect(planForDate(r, days, MONDAY).today.map((d) => d.name)).toEqual(["Push", "Fútbol"]);
  });

  it("on a rest day, points to the next session", () => {
    const plan = planForDate(r, days, TUESDAY);
    expect(plan.today).toEqual([]);
    expect(plan.upcoming).toMatchObject({ day: pull, inDays: 1 });
  });

  it("wraps around the week", () => {
    expect(planForDate(r, days, SATURDAY).upcoming).toMatchObject({ day: push, inDays: 2 });
  });
});

describe("rotation", () => {
  const r = routine({ schedule_type: "rotation", training_weekdays: [0, 1, 3, 4] });
  const a = day({ name: "A", position: 0 });
  const b = day({ name: "B", position: 1 });
  const c = day({ name: "C", position: 2 });
  const football = day({ name: "Fútbol", kind: "sport", sport: "Fútbol", weekday: 2, position: 3 });
  const days = [c, football, a, b];

  it("starts with the first day and continues after the last one done", () => {
    expect(nextRotationDay(days, null)).toBe(a);
    expect(nextRotationDay(days, a.id)).toBe(b);
    expect(nextRotationDay(days, c.id)).toBe(a);
    expect(nextRotationDay([football], null)).toBeNull();
  });

  it("on a training day, the next gym day is today's", () => {
    const plan = planForDate(r, days, MONDAY, b.id);
    expect(plan.today).toEqual([c]);
    expect(plan.upcoming).toMatchObject({ day: a, inDays: 1 });
  });

  it("pinned sports show on their weekday and the gym day waits", () => {
    const plan = planForDate(r, days, WEDNESDAY, null);
    expect(plan.today).toEqual([football]);
    expect(plan.upcoming).toMatchObject({ day: a, inDays: 1 });
  });

  it("before a pinned sport, the sport is the next session", () => {
    expect(planForDate(r, days, TUESDAY, a.id).upcoming).toMatchObject({ day: football, inDays: 1 });
  });

  it("without training days set, every day is a training day", () => {
    const loose = routine({ schedule_type: "rotation", training_weekdays: [] });
    expect(planForDate(loose, [a, b], SATURDAY, a.id).today).toEqual([b]);
  });
});

describe("week strip", () => {
  it("marks gym and sport days for each kind of routine", () => {
    const weekly = weekStrip(routine(), [day({ weekday: 0 }), day({ kind: "sport", sport: "Pádel", weekday: 5 })]);
    expect(weekly.filter((d) => d.gym).map((d) => d.weekday)).toEqual([0]);
    expect(weekly.filter((d) => d.sport).map((d) => d.weekday)).toEqual([5]);

    const rotation = weekStrip(routine({ schedule_type: "rotation", training_weekdays: [1, 3] }), [day()]);
    expect(rotation.filter((d) => d.gym).map((d) => d.weekday)).toEqual([1, 3]);
  });
});
