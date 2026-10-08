import { describe, expect, it } from "vitest";
import { day, routine } from "./routines/test-fixtures";
import { weeklyStreak, weeklyTarget } from "./streak";

const done = (date: string) => ({ date, status: "completed" as const, deleted_at: null });

// Thursday 8 October 2026; weeks start 5 Oct, 28 Sep, 21 Sep, 14 Sep.
const TODAY = "2026-10-08";

describe("weeklyStreak", () => {
  it("counts the weeks in a row that met the target", () => {
    const sessions = [done("2026-09-29"), done("2026-10-01"), done("2026-09-22"), done("2026-09-24")];
    expect(weeklyStreak(sessions, 2, TODAY)).toEqual({ current: 2, best: 2, thisWeek: { done: 0, target: 2 } });
  });

  it("the week in progress adds once met, and never breaks the streak before it ends", () => {
    const sessions = [done("2026-09-29"), done("2026-10-05"), done("2026-10-06")];
    // Last week (1 session) missed a target of 2; this week already has 2.
    expect(weeklyStreak(sessions, 2, TODAY).current).toBe(1);
    expect(weeklyStreak(sessions, 1, TODAY).current).toBe(2);
    expect(weeklyStreak([done("2026-09-29")], 1, TODAY)).toMatchObject({ current: 1, thisWeek: { done: 0 } });
  });

  it("a missed week resets it, but the best run is kept", () => {
    const sessions = [done("2026-09-01"), done("2026-09-08"), done("2026-09-15"), done("2026-09-29")];
    expect(weeklyStreak(sessions, 1, TODAY)).toMatchObject({ current: 1, best: 3 });
  });

  it("only completed, not deleted, not future sessions count", () => {
    const sessions = [
      { date: "2026-09-29", status: "skipped" as const, deleted_at: null },
      { date: "2026-09-30", status: "completed" as const, deleted_at: "x" },
      done("2026-10-20"),
    ];
    expect(weeklyStreak(sessions, 1, TODAY)).toEqual({ current: 0, best: 0, thisWeek: { done: 0, target: 1 } });
  });
});

describe("weeklyTarget", () => {
  it("is the routine's target, or what it plans, or one session", () => {
    expect(weeklyTarget(null, [])).toBe(1);
    expect(weeklyTarget(routine({ weekly_target: 5 }), [])).toBe(5);
    const r = routine({ schedule_type: "rotation", training_weekdays: [0, 1, 3, 4] });
    const days = [day({ kind: "gym" }), day({ kind: "sport", sport: "football", weekday: 2 })];
    expect(weeklyTarget(r, days)).toBe(5);
    expect(weeklyTarget(routine(), [])).toBe(1);
  });
});
