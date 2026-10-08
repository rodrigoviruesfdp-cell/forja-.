import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "@/data/local/db";
import { saveChanges } from "@/data/local/mutations";
import { session as sessionRow, sessionExercise, set } from "@/domain/sessions/test-fixtures";
import { achievementRowId, achievementSessions, checkAchievements, markAchievementsSeen, toggleFeaturedAchievement } from "./achievements";

const USER = "11111111-1111-4111-8111-111111111111";
let db: LocalDb;

beforeEach(() => {
  db = new LocalDb(`achievements-${crypto.randomUUID()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const surf = (date: string, placeId: string) =>
  sessionRow({ user_id: USER, date, kind: "sport", sport: "surf", status: "completed", place_id: placeId, started_at: null });

describe("achievements repository", () => {
  it("adds up kilos and records of completed gym sessions only", async () => {
    const gym = sessionRow({ user_id: USER, status: "completed" });
    const open = sessionRow({ user_id: USER, status: "in_progress" });
    const item = sessionExercise({ user_id: USER, session_id: gym.id });
    const openItem = sessionExercise({ user_id: USER, session_id: open.id });
    await saveChanges(db, {
      sessions: [gym, open],
      session_exercises: [item, openItem],
      session_sets: [
        set(100, 5, { user_id: USER, session_exercise_id: item.id, is_pr: true }),
        set(20, 10, { user_id: USER, session_exercise_id: item.id, is_warmup: true }),
        set(100, 5, { user_id: USER, session_exercise_id: openItem.id }),
      ],
    });
    const sessions = await achievementSessions(db);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ id: gym.id, volumeKg: 500, records: 1 });
  });

  it("stores each level once, with the same id on every phone", async () => {
    const spots = ["a", "b", "c", "d", "e"].map((s, i) => surf(`2026-09-0${i + 1}`, `aaaaaaaa-0000-4000-8000-00000000000${i + 1}`));
    await saveChanges(db, { sessions: spots });

    const first = await checkAchievements(db, USER);
    expect(first.map((row) => `${row.achievement_key}:${row.tier}`)).toEqual(["first_session:1", "the_search:1"]);
    const search = first.find((row) => row.achievement_key === "the_search")!;
    expect(search.session_id).toBe(spots[4]!.id);
    expect(search.id).toBe(await achievementRowId(USER, "the_search", 1));
    expect(search.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await db.outbox.where("table").equals("user_achievements").count()).toBe(2);

    expect(await checkAchievements(db, USER)).toEqual([]);

    // Deleting the sessions does not take it away.
    await saveChanges(db, { sessions: spots.map((s) => ({ ...s, deleted_at: "2026-10-01T00:00:00Z" })) });
    expect(await checkAchievements(db, USER)).toEqual([]);
    expect(await db.user_achievements.count()).toBe(2);
  });

  it("marks unlocks seen and pins them to the highlights", async () => {
    await saveChanges(db, { sessions: [surf("2026-09-01", "aaaaaaaa-0000-4000-8000-000000000001")] });
    const [row] = await checkAchievements(db, USER);
    await markAchievementsSeen(db, [row!]);
    expect((await db.user_achievements.get(row!.id))?.seen_at).not.toBeNull();

    await toggleFeaturedAchievement(db, "first_session");
    expect((await db.user_achievements.get(row!.id))?.featured_position).toBe(0);
    await toggleFeaturedAchievement(db, "first_session");
    expect((await db.user_achievements.get(row!.id))?.featured_position).toBeNull();
  });
});
