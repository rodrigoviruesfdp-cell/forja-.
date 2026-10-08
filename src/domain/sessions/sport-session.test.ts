import { describe, expect, it } from "vitest";
import { day, testClock, USER } from "../routines/test-fixtures";
import { sessionSchema } from "../schemas";
import { editSportSession, newSportSession, type SportInput, skipDay } from "./sport-session";

const input = (patch: Partial<SportInput> = {}): SportInput => ({
  sport: "surf",
  date: "2026-10-05",
  durationMin: 120,
  rpe: 7,
  distanceKm: null,
  placeId: null,
  metrics: { waves: 14 },
  notes: null,
  routineDayId: null,
  title: "Surf",
  ...patch,
});

describe("sport sessions", () => {
  it("logs a past sport session as completed, with what the sport counts", () => {
    const row = newSportSession(USER, input({ notes: "  Glassy  " }), testClock());
    expect(sessionSchema.parse(row)).toMatchObject({
      kind: "sport",
      status: "completed",
      sport: "surf",
      date: "2026-10-05",
      duration_min: 120,
      rpe: 7,
      metrics: { waves: 14 },
      notes: "Glassy",
      started_at: null,
    });
  });

  it("stores the sport as its code and drops what does not apply", () => {
    const row = newSportSession(USER, input({ sport: "Boxeo", distanceKm: 5, metrics: { rounds: 8, waves: 3 } }), testClock());
    expect(row).toMatchObject({ sport: "boxing", distance_km: null, metrics: { rounds: 8 } });
    const run = newSportSession(USER, input({ sport: "running", distanceKm: 10.456, durationMin: 0, rpe: 14 }), testClock());
    expect(run).toMatchObject({ distance_km: 10.46, duration_min: null, rpe: 10, metrics: {} });
  });

  it("keeps a sport that is not in the list", () => {
    expect(newSportSession(USER, input({ sport: " Remo ", title: "Remo" }), testClock())).toMatchObject({ sport: "Remo" });
  });

  it("rejects impossible dates", () => {
    expect(() => newSportSession(USER, input({ date: "2026-02-30" }), testClock())).toThrow();
  });

  it("editing keeps the identity of the session", () => {
    const row = newSportSession(USER, input(), testClock());
    const edited = editSportSession(row, input({ durationMin: 90, placeId: "p1" }));
    expect(edited).toMatchObject({ id: row.id, created_at: row.created_at, duration_min: 90, place_id: "p1" });
  });

  it("skipping a planned day records it for that date", () => {
    const football = day({ name: "Fútbol", kind: "sport", sport: "football", weekday: 2 });
    expect(sessionSchema.parse(skipDay(USER, football, "2026-10-07", testClock()))).toMatchObject({
      status: "skipped",
      kind: "sport",
      sport: "football",
      routine_day_id: football.id,
      date: "2026-10-07",
    });
  });
});
