import { describe, expect, it } from "vitest";
import { defaultComparison, fitInside, groupByMonth, newProgressPhoto, photoPaths, timeBetween } from "./photos";
import type { Media } from "./schemas";

const USER = "11111111-1111-4111-8111-111111111111";
let n = 0;
const clock = () => ({ now: `2026-10-09T10:00:${String(++n).padStart(2, "0")}Z`, newId: () => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}` });
const photo = (takenAt: string, pose: Media["pose"] = "front", patch: Partial<Media> = {}) => ({
  ...newProgressPhoto(USER, { takenAt, pose, width: 1200, height: 1600 }, clock()),
  ...patch,
});

describe("progress photos", () => {
  it("keeps the files in the owner's folder", () => {
    expect(photoPaths(USER, "m1")).toEqual({ full: `${USER}/progress/m1.jpg`, thumb: `${USER}/progress/m1-thumb.jpg` });
    const row = photo("2026-10-01");
    expect(row.storage_path.startsWith(`${USER}/progress/`)).toBe(true);
    expect(row).toMatchObject({ kind: "progress", taken_at: "2026-10-01", pose: "front", deleted_at: null });
  });

  it("shrinks to fit, never enlarges", () => {
    expect(fitInside(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitInside(3024, 4032, 400)).toEqual({ width: 300, height: 400 });
    expect(fitInside(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("groups by month, newest first, without deleted ones", () => {
    const rows = [photo("2026-09-03"), photo("2026-10-08"), photo("2026-10-01"), photo("2026-08-20", "front", { deleted_at: "x" })];
    expect(groupByMonth(rows).map((g) => [g.month, g.photos.map((p) => p.taken_at)])).toEqual([
      ["2026-10", ["2026-10-08", "2026-10-01"]],
      ["2026-09", ["2026-09-03"]],
    ]);
  });

  it("compares the latest photo with the oldest in the same pose", () => {
    const oldFront = photo("2026-01-10", "front");
    const oldSide = photo("2025-12-01", "side");
    const midFront = photo("2026-05-01", "front");
    const latest = photo("2026-10-08", "front");
    expect(defaultComparison([midFront, oldSide, latest, oldFront])).toEqual({ before: oldFront, after: latest });
    // No other photo in that pose: the oldest of all.
    const sideNow = photo("2026-10-09", "side");
    expect(defaultComparison([oldFront, sideNow])).toEqual({ before: oldFront, after: sideNow });
    expect(defaultComparison([latest])).toBeNull();
  });

  it("says how long passed between two photos", () => {
    expect(timeBetween("2026-01-10", "2026-10-08")).toEqual({ months: 8, days: 28 });
    expect(timeBetween("2026-10-08", "2026-01-10")).toEqual({ months: 8, days: 28 });
    expect(timeBetween("2026-09-08", "2026-10-08")).toEqual({ months: 1, days: 0 });
    expect(timeBetween("2026-10-01", "2026-10-08")).toEqual({ months: 0, days: 7 });
  });
});
