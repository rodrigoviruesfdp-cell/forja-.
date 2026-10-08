import { describe, expect, it } from "vitest";
import { dayMarks, monthGrid, projectPlan } from "./calendar";
import { day, routine } from "./routines/test-fixtures";
import { session } from "./sessions/test-fixtures";

describe("monthGrid", () => {
  it("covers the month in Monday-first weeks", () => {
    // October 2026 starts on a Thursday and ends on a Saturday.
    const weeks = monthGrid(2026, 9);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.map((c) => c.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks[0]?.filter((c) => c.inMonth).map((c) => c.day)).toEqual([1, 2, 3, 4]);
    expect(weeks.at(-1)?.at(-1)).toEqual({ date: "2026-11-01", day: 1, inMonth: false });
  });

  it("uses six weeks only when the month needs them", () => {
    // August 2026 starts on a Saturday and has 31 days.
    expect(monthGrid(2026, 7)).toHaveLength(6);
    // February 2027 starts on a Monday and has 28 days.
    expect(monthGrid(2027, 1)).toHaveLength(4);
  });
});

describe("projectPlan", () => {
  // Thursday 8 October 2026.
  const TODAY = "2026-10-08";

  it("weekly: each day on its weekday", () => {
    const r = routine();
    const mon = day({ name: "Lunes", weekday: 0 });
    const thu = day({ name: "Jueves", weekday: 3 });
    const plan = projectPlan(r, [mon, thu], TODAY, "2026-10-15", null);
    expect([...plan.keys()]).toEqual(["2026-10-08", "2026-10-12", "2026-10-15"]);
  });

  it("rotation: the next days in order, one per training weekday, with pinned sports", () => {
    const r = routine({ schedule_type: "rotation", training_weekdays: [0, 1, 3, 4] });
    const a = day({ name: "A", position: 0 });
    const b = day({ name: "B", position: 1 });
    const c = day({ name: "C", position: 2 });
    const football = day({ name: "Fútbol", kind: "sport", sport: "football", weekday: 2, position: 3 });
    const plan = projectPlan(r, [a, b, c, football], TODAY, "2026-10-14", a.id);
    const names = [...plan].map(([date, days]) => `${date}:${days.map((d) => d.name).join("+")}`);
    expect(names).toEqual(["2026-10-08:B", "2026-10-09:C", "2026-10-12:A", "2026-10-13:B", "2026-10-14:Fútbol"]);
  });

  it("rotation: once today's gym slot is used, the next day moves to the next training day", () => {
    const r = routine({ schedule_type: "rotation", training_weekdays: [3, 4] });
    const a = day({ name: "A", position: 0 });
    const b = day({ name: "B", position: 1 });
    const plan = projectPlan(r, [a, b], TODAY, "2026-10-09", a.id, true);
    expect([...plan].map(([date, days]) => `${date}:${days[0]?.name}`)).toEqual(["2026-10-09:B"]);
  });
});

describe("dayMarks", () => {
  const a = day({ name: "A" });
  const surf = day({ name: "Surf", kind: "sport", sport: "surf" });

  it("a rest day has nothing", () => {
    expect(dayMarks([], [])).toEqual({ completed: 0, inProgress: false, skipped: false, planned: 0 });
  });

  it("counts what was done and what is still planned", () => {
    const done = session({ status: "completed", routine_day_id: a.id });
    expect(dayMarks([done], [a, surf])).toEqual({ completed: 1, inProgress: false, skipped: false, planned: 1 });
  });

  it("a skipped day shows as skipped unless something else was done", () => {
    const skipped = session({ status: "skipped", routine_day_id: a.id });
    expect(dayMarks([skipped], [a])).toMatchObject({ skipped: true, planned: 0 });
    const sport = session({ status: "completed", kind: "sport", sport: "surf" });
    expect(dayMarks([skipped, sport], [a])).toMatchObject({ skipped: false, completed: 1 });
  });

  it("ignores deleted sessions", () => {
    expect(dayMarks([session({ status: "completed", deleted_at: "x" })], [])).toMatchObject({ completed: 0 });
  });
});
