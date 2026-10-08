import { describe, expect, it } from "vitest";
import { coverCrop, routineLayout, shareStats } from "./share";
import { session } from "./sessions/test-fixtures";

describe("shareStats", () => {
  it("gym: duration, volume and sets, skipping zeros", () => {
    const gym = session({ status: "completed", duration_min: 52 });
    const summary = { durationMin: 52, exercises: 4, workSets: 14, volumeKg: 4250, records: [] };
    expect(shareStats(gym, summary)).toEqual([
      { key: "duration", value: 52 },
      { key: "volume", value: 4250 },
      { key: "sets", value: 14 },
    ]);
    const bodyweight = { ...summary, volumeKg: 0 };
    expect(shareStats(gym, bodyweight).map((s) => s.key)).toEqual(["duration", "sets"]);
  });

  it("sport: duration, what the sport counts, distance, effort — three at most", () => {
    const surf = session({ kind: "sport", sport: "surf", duration_min: 90, metrics: { waves: 14 }, rpe: 7 });
    expect(shareStats(surf, null).map((s) => `${s.key}:${s.value}`)).toEqual(["duration:90", "waves:14", "effort:7"]);
    const run = session({ kind: "sport", sport: "running", duration_min: 42, distance_km: 8.5, rpe: 6, metrics: {} });
    expect(shareStats(run, null).map((s) => s.key)).toEqual(["duration", "distance", "effort"]);
    expect(shareStats(session({ kind: "sport", sport: "yoga", duration_min: null, metrics: {} }), null)).toEqual([]);
  });
});

describe("coverCrop", () => {
  it("crops the sides of a wide photo to fill a story", () => {
    expect(coverCrop(4000, 3000, 1080, 1920)).toEqual({ sx: 1156.25, sy: 0, sw: 1687.5, sh: 3000 });
  });

  it("crops the top and bottom of a tall photo", () => {
    const crop = coverCrop(1000, 3000, 1080, 1920);
    expect(crop.sw).toBeCloseTo(1000, 6);
    expect(crop.sy).toBeCloseTo((3000 - 1777.78) / 2, 1);
  });
});

describe("routineLayout", () => {
  it("gives every day as many lines of exercises as fit, three at most", () => {
    expect(routineLayout([5, 5, 5], 1000, 100, 50)).toEqual({ days: 3, lines: 3 });
    // 5 gym days and 2 sport days: 700 for the names, 300 left for 5 days with exercises.
    expect(routineLayout([5, 5, 5, 5, 5, 0, 0], 1000, 100, 50)).toEqual({ days: 7, lines: 1 });
    expect(routineLayout([5, 5, 5, 5, 5, 0, 0], 900, 100, 50)).toEqual({ days: 7, lines: 0 });
    expect(routineLayout([0, 0], 1000, 100, 50)).toEqual({ days: 2, lines: 0 });
  });

  it("leaves out the days that do not fit, keeping a line to say so", () => {
    expect(routineLayout(Array(12).fill(4), 1000, 100, 50)).toEqual({ days: 9, lines: 0 });
  });
});
