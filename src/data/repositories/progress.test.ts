import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "@/data/local/db";
import { saveChanges } from "@/data/local/mutations";
import { session as sessionRow, sessionExercise, set } from "@/domain/sessions/test-fixtures";
import { progressData } from "./progress";

const USER = "11111111-1111-4111-8111-111111111111";
let db: LocalDb;

beforeEach(() => {
  db = new LocalDb(`progress-${crypto.randomUUID()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("progress data", () => {
  it("takes completed sessions and the work sets of the gym ones, with their muscle", async () => {
    const gym = sessionRow({ user_id: USER, status: "completed", duration_min: 50, rpe: 8 });
    const live = sessionRow({ user_id: USER, status: "in_progress" });
    const surf = sessionRow({ user_id: USER, kind: "sport", sport: "surf", status: "completed", duration_min: 90, metrics: { waves: 12 } });
    const item = sessionExercise({ user_id: USER, session_id: gym.id });
    const liveItem = sessionExercise({ user_id: USER, session_id: live.id });
    const work = set(80, 5, { user_id: USER, session_exercise_id: item.id, is_pr: true });
    await saveChanges(db, {
      sessions: [gym, live, surf],
      session_exercises: [item, liveItem],
      session_sets: [
        work,
        set(40, 10, { user_id: USER, session_exercise_id: item.id, is_warmup: true }),
        set(80, 5, { user_id: USER, session_exercise_id: liveItem.id }),
      ],
    });

    const data = await progressData(db);
    expect(data.sessions.map((s) => [s.kind, s.durationMin, s.rpe])).toEqual(
      expect.arrayContaining([
        ["gym", 50, 8],
        ["sport", 90, null],
      ]),
    );
    expect(data.sessions).toHaveLength(2);
    expect(data.sets).toEqual([
      expect.objectContaining({ id: work.id, sessionId: gym.id, weightKg: 80, reps: 5, isPr: true, muscle: null }),
    ]);
  });
});
