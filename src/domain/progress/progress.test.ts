import { describe, expect, it } from "vitest";
import { bucketIndex, bucketsOf, periodOf, previousPeriod, weeksIn } from "./period";
import {
  exerciseHistory,
  exerciseSummaries,
  loadPerBucket,
  metricsFor,
  minutesPerBucket,
  type ProgressSession,
  type ProgressSet,
  recentRecords,
  setsPerMuscle,
  sportTotals,
  totals,
} from "./stats";

const TODAY = "2026-10-08"; // a Thursday

let n = 0;
function session(patch: Partial<ProgressSession> = {}): ProgressSession {
  n += 1;
  return { id: `s${n}`, date: TODAY, kind: "gym", sport: null, durationMin: 60, rpe: null, distanceKm: null, metrics: {}, ...patch };
}

function set(patch: Partial<ProgressSet> = {}): ProgressSet {
  n += 1;
  return {
    id: `x${n}`,
    sessionId: "s1",
    date: TODAY,
    completedAt: `${patch.date ?? TODAY}T18:${String(n % 60).padStart(2, "0")}:00Z`,
    exerciseId: "bench",
    muscle: "chest",
    weightKg: 60,
    reps: 8,
    isPr: false,
    ...patch,
  };
}

describe("periods", () => {
  it("counts whole weeks back from the current one", () => {
    expect(periodOf("4w", TODAY, null)).toEqual({ start: "2026-09-14", end: TODAY });
    expect(periodOf("3m", TODAY, null).start).toBe("2026-07-13");
    expect(periodOf("1y", TODAY, null).start).toBe("2025-10-13");
    // "All" starts at the week of the first session, and never shows less than 4 weeks.
    expect(periodOf("all", TODAY, "2025-03-05").start).toBe("2025-03-03");
    expect(periodOf("all", TODAY, "2026-10-01").start).toBe("2026-09-14");
  });

  it("compares with the same days just before", () => {
    expect(previousPeriod({ start: "2026-09-14", end: "2026-10-08" })).toEqual({ start: "2026-08-20", end: "2026-09-13" });
    expect(weeksIn({ start: "2026-09-14", end: "2026-10-11" })).toBe(4);
  });

  it("groups by week, or by month past 26 weeks", () => {
    const weeks = bucketsOf(periodOf("3m", TODAY, null));
    expect(weeks).toHaveLength(13);
    expect(weeks[0]).toEqual({ start: "2026-07-13", end: "2026-07-19", kind: "week" });
    const months = bucketsOf(periodOf("1y", TODAY, null));
    expect(months).toHaveLength(13);
    expect(months[0]).toEqual({ start: "2025-10-01", end: "2025-10-31", kind: "month" });
    expect(months.at(-1)).toEqual({ start: "2026-10-01", end: "2026-10-31", kind: "month" });
    expect(bucketIndex(weeks, "2026-10-08")).toBe(12);
    expect(bucketIndex(weeks, "2026-07-12")).toBe(-1);
  });
});

describe("totals, time and load", () => {
  const period = periodOf("4w", TODAY, null);

  it("adds up the period only", () => {
    const sessions = [session({ durationMin: 50 }), session({ kind: "sport", sport: "surf", durationMin: 90 }), session({ date: "2026-08-01" })];
    const sets = [set({ isPr: true }), set(), set({ date: "2026-08-01", isPr: true })];
    expect(totals(sessions, sets, period)).toEqual({ sessions: 2, minutes: 140, volumeKg: 960, records: 1 });
  });

  it("splits minutes and load (minutes × effort) between gym and sports", () => {
    const buckets = bucketsOf(period);
    const sessions = [
      session({ date: "2026-10-06", durationMin: 60, rpe: 8 }),
      session({ date: "2026-10-07", kind: "sport", sport: "surf", durationMin: 90, rpe: 6 }),
      session({ date: "2026-10-08", durationMin: 45, rpe: null }),
      session({ date: "2026-09-15", durationMin: 30, rpe: 5 }),
    ];
    const minutes = minutesPerBucket(sessions, buckets);
    expect(minutes.map((m) => [m.gym, m.sport])).toEqual([
      [30, 0],
      [0, 0],
      [0, 0],
      [105, 90],
    ]);
    const load = loadPerBucket(sessions, buckets);
    expect(load.values.at(-1)).toMatchObject({ gym: 480, sport: 540 });
    expect(load.missing).toBe(1);
  });

  it("counts work sets per muscle, with a weekly average", () => {
    const sets = [set(), set(), set({ muscle: "lats" }), set({ muscle: null }), set({ date: "2026-01-01" })];
    expect(setsPerMuscle(sets, { start: "2026-09-14", end: "2026-10-11" })).toEqual([
      { muscle: "chest", sets: 2, perWeek: 0.5 },
      { muscle: "lats", sets: 1, perWeek: 0.3 },
    ]);
  });
});

describe("one exercise over time", () => {
  it("keeps the best of each session, oldest first", () => {
    const sets = [
      set({ sessionId: "b", date: "2026-10-01", weightKg: 70, reps: 5, isPr: true }),
      set({ sessionId: "b", date: "2026-10-01", weightKg: 65, reps: 8 }),
      set({ sessionId: "a", date: "2026-09-24", weightKg: 60, reps: 8 }),
    ];
    const points = exerciseHistory(sets);
    expect(points.map((p) => p.sessionId)).toEqual(["a", "b"]);
    expect(points[1]).toMatchObject({ weightKg: 70, repsAtWeight: 5, maxReps: 8, volumeKg: 870, sets: 2, isPr: true });
    // Epley: 65 × (1 + 8/30) = 82.3 beats 70 × (1 + 5/30) = 81.7.
    expect(points[1]?.e1rmKg).toBeCloseTo(82.33, 2);
    expect(metricsFor(points)).toEqual(["e1rm", "weight", "volume"]);
  });

  it("charts reps when there is no added weight", () => {
    const points = exerciseHistory([set({ exerciseId: "pullup", weightKg: 0, reps: 12 }), set({ exerciseId: "pullup", weightKg: 0, reps: 10 })]);
    expect(metricsFor(points)).toEqual(["reps"]);
    expect(points[0]?.maxReps).toBe(12);
  });

  it("summarises the exercises of the period, most frequent first", () => {
    const sets = [
      set({ sessionId: "1", date: "2026-09-20", weightKg: 60, reps: 1 }),
      set({ sessionId: "2", date: "2026-10-01", weightKg: 65, reps: 1 }),
      set({ sessionId: "3", date: "2026-10-01", exerciseId: "row", weightKg: 50, reps: 1 }),
    ];
    const [bench, row] = exerciseSummaries(sets, periodOf("4w", TODAY, null));
    expect(bench).toMatchObject({ exerciseId: "bench", sessions: 2, metric: "e1rm", latest: 65, change: 5, trend: [60, 65] });
    expect(row).toMatchObject({ exerciseId: "row", sessions: 1, change: null });
  });

  it("lists the latest records", () => {
    const old = set({ isPr: true, date: "2026-09-20" });
    const recent = set({ isPr: true, date: "2026-10-07" });
    expect(recentRecords([old, set(), recent], periodOf("4w", TODAY, null)).map((s) => s.id)).toEqual([recent.id, old.id]);
  });
});

describe("sports", () => {
  it("adds up each sport, typed the same way or not", () => {
    const sessions = [
      session({ kind: "sport", sport: "surf", durationMin: 90, metrics: { waves: 10 } }),
      session({ kind: "sport", sport: "surf", durationMin: 60, metrics: { waves: 4 } }),
      session({ kind: "sport", sport: "Remo", durationMin: 40, distanceKm: 8 }),
      session({ kind: "sport", sport: "remo", durationMin: 30, distanceKm: 6 }),
      session(),
    ];
    expect(sportTotals(sessions, periodOf("4w", TODAY, null))).toEqual([
      { sport: "surf", sessions: 2, minutes: 150, distanceKm: 0, metrics: { waves: 14 } },
      { sport: "Remo", sessions: 2, minutes: 70, distanceKm: 14, metrics: {} },
    ]);
  });
});
