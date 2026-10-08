import { describe, expect, it } from "vitest";
import { findRecords, type HistorySet, staleRecordFlags } from "./records";
import { set } from "./test-fixtures";
import type { SessionSet } from "../schemas";

const A = "session-a";
const B = "session-b";
const C = "session-c";
const h = (s: SessionSet, sessionId: string): HistorySet => ({ set: s, sessionId });

describe("findRecords", () => {
  it("the first session of an exercise only sets the baseline", () => {
    const history = [h(set(60, 10, { at: 1 }), A), h(set(62.5, 8, { at: 2 }), A), h(set(65, 6, { at: 3 }), A)];
    expect(findRecords(history).size).toBe(0);
  });

  it("a heavier weight is a record", () => {
    const heavier = set(65, 5, { at: 10 });
    const records = findRecords([h(set(60, 10, { at: 1 }), A), h(heavier, B)]);
    expect(records.get(heavier.id)).toEqual(["weight"]);
  });

  it("more reps with the same weight beat the estimated 1RM", () => {
    const more = set(60, 12, { at: 10 });
    const records = findRecords([h(set(60, 10, { at: 1 }), A), h(more, B)]);
    expect(records.get(more.id)).toEqual(["e1rm"]);
  });

  it("matching your best is not a record", () => {
    const same = set(60, 10, { at: 10 });
    expect(findRecords([h(set(60, 10, { at: 1 }), A), h(same, B)]).has(same.id)).toBe(false);
  });

  it("ignores warm-ups, deleted sets and sets with no reps", () => {
    const warmup = set(100, 5, { at: 10, is_warmup: true });
    const deleted = set(100, 5, { at: 11, deleted_at: "2026-10-07T11:00:00.000Z" });
    const failed = set(100, 0, { at: 12 });
    const records = findRecords([h(set(60, 10, { at: 1 }), A), h(warmup, B), h(deleted, B), h(failed, B)]);
    expect(records.size).toBe(0);
  });

  it("a warm-up never raises the bar for the real sets", () => {
    const real = set(70, 5, { at: 11 });
    const records = findRecords([h(set(60, 12, { at: 1 }), A), h(set(100, 5, { at: 10, is_warmup: true }), B), h(real, B)]);
    expect(records.get(real.id)).toEqual(["weight"]);
  });

  it("several sets of the same session can each beat the one before", () => {
    const first = set(62.5, 8, { at: 10 });
    const second = set(65, 8, { at: 11 });
    const records = findRecords([h(set(60, 8, { at: 1 }), A), h(first, B), h(second, B)]);
    expect([...records.keys()]).toEqual([first.id, second.id]);
  });

  it("long sets do not count for the estimated 1RM, but a heavier weight still does", () => {
    const light = set(40, 30, { at: 10 });
    const heavyLong = set(105, 15, { at: 11 });
    const records = findRecords([h(set(100, 5, { at: 1 }), A), h(light, B), h(heavyLong, B)]);
    expect(records.has(light.id)).toBe(false);
    expect(records.get(heavyLong.id)).toEqual(["weight"]);
  });

  it("without added weight (pull-ups) more reps are a record", () => {
    const more = set(0, 12, { at: 10 });
    const records = findRecords([h(set(0, 10, { at: 1 }), A), h(more, B)]);
    expect(records.get(more.id)).toEqual(["reps"]);
  });

  it("goes by the time each set was done, not the order they arrive in", () => {
    const later = set(70, 5, { at: 20 });
    const earlier = set(65, 5, { at: 10 });
    const records = findRecords([h(later, C), h(set(60, 5, { at: 1 }), A), h(earlier, B)]);
    expect([...records.keys()]).toEqual([earlier.id, later.id]);
  });
});

describe("staleRecordFlags", () => {
  it("returns only the sets whose cached flag is wrong", () => {
    const base = set(60, 10, { at: 1 });
    const pr = set(70, 5, { at: 10 });
    const wrong = set(50, 5, { at: 11, is_pr: true });
    const changed = staleRecordFlags([h(base, A), h(pr, B), h(wrong, B)]);
    expect(changed.map((s) => [s.id, s.is_pr])).toEqual([
      [pr.id, true],
      [wrong.id, false],
    ]);
  });

  it("deleting the old best makes a later set the record (and the other way round)", () => {
    const oldBest = set(80, 5, { at: 1 });
    const today = set(75, 5, { at: 10, is_pr: false });
    const middle = set(70, 5, { at: 5 });
    expect(staleRecordFlags([h(oldBest, A), h(middle, B), h(today, C)])).toEqual([]);
    const afterDelete = staleRecordFlags([h({ ...oldBest, deleted_at: "x" }, A), h(middle, B), h(today, C)]);
    expect(afterDelete.map((s) => s.id)).toEqual([today.id]);
  });
});
