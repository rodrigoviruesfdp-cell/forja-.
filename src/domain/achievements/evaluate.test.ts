import { describe, expect, it } from "vitest";
import { addDays } from "../dates";
import type { UserAchievement } from "../schemas";
import { USER } from "../routines/test-fixtures";
import { type Achievement, achievementByKey, displayValue, tierTone } from "./catalog";
import {
  type AchievementSession,
  evaluateAchievements,
  highlights,
  newUnlocks,
  progressOf,
  toggleFeatured,
} from "./evaluate";

let counter = 0;
function done(patch: Partial<AchievementSession> = {}): AchievementSession {
  counter += 1;
  return {
    id: `s${counter}`,
    date: "2026-10-05",
    kind: "gym",
    sport: null,
    placeId: null,
    startedAt: null,
    endedAt: null,
    createdAt: `2026-10-05T10:00:${String(counter % 60).padStart(2, "0")}Z`,
    volumeKg: 0,
    records: 0,
    ...patch,
  };
}

const surf = (date: string, placeId: string) => done({ date, kind: "sport", sport: "surf", placeId });
const options = { weeklyTarget: 2 };

function stateOf(key: string, sessions: AchievementSession[], opts = options) {
  const achievement = achievementByKey(key) as Achievement;
  const [state] = evaluateAchievements(sessions, opts, [achievement]);
  return state!;
}

describe("evaluateAchievements", () => {
  it("credits each level to the session that reached it, in the order things happened", () => {
    const sessions = [
      surf("2026-09-03", "zurriola"),
      surf("2026-09-01", "zurriola"),
      surf("2026-09-02", "mundaka"),
      surf("2026-09-10", "sopela"),
      surf("2026-09-12", "zarautz"),
      surf("2026-09-20", "rodiles"),
    ];
    const state = stateOf("the_search", sessions);
    expect(state.value).toBe(5);
    // The fifth different spot was Rodiles on the 20th, not the last one saved.
    expect(state.unlocks).toEqual([{ key: "the_search", tier: 1, sessionId: sessions[5]!.id, at: expect.any(String) }]);
  });

  it("only counts the sessions its filter allows", () => {
    const boxing = (date: string) => done({ date, kind: "sport", sport: "boxeo" });
    const sessions = [boxing("2026-09-01"), boxing("2026-09-01"), boxing("2026-09-02"), done({ date: "2026-09-03" })];
    // "boxeo" typed by hand is the boxing code; two sessions on one day are one day.
    expect(stateOf("balboa", sessions).value).toBe(2);
    expect(stateOf("iron", sessions).value).toBe(1);
    expect(stateOf("first_session", sessions).unlocks.map((u) => u.sessionId)).toEqual([sessions[0]!.id]);
  });

  it("adds up kilos and records of gym sessions", () => {
    const sessions = [done({ volumeKg: 6_000, records: 1 }), done({ volumeKg: 5_000, records: 2 }), done({ volumeKg: 90_000 })];
    const tonnes = stateOf("tonnes", sessions);
    expect(tonnes.unlocks.map((u) => [u.tier, u.sessionId])).toEqual([
      [1, sessions[1]!.id],
      [2, sessions[2]!.id],
    ]);
    expect(displayValue(tonnes.achievement, tonnes.value)).toBe(101);
    expect(stateOf("records", sessions).value).toBe(3);
  });

  it("can reach several levels with one session", () => {
    const sessions = [done({ records: 12 })];
    expect(stateOf("records", sessions).unlocks.map((u) => u.tier)).toEqual([1, 2]);
  });

  it("counts different sports and days with gym and a sport", () => {
    const sessions = [
      done({ date: "2026-09-01" }),
      done({ date: "2026-09-01", kind: "sport", sport: "surf" }),
      done({ date: "2026-09-02", kind: "sport", sport: "Pádel" }),
      done({ date: "2026-09-03", kind: "sport", sport: "Remo" }),
      done({ date: "2026-09-04", kind: "sport", sport: "remo " }),
    ];
    expect(stateOf("all_rounder", sessions).value).toBe(3);
    expect(stateOf("double", sessions).value).toBe(1);
  });

  it("measures the best run of weeks that met the weekly target", () => {
    const week = (monday: string, count: number) => Array.from({ length: count }, (_, i) => done({ date: addDays(monday, i) }));
    const sessions = [
      ...week("2026-08-03", 2),
      ...week("2026-08-10", 2),
      ...week("2026-08-17", 1), // missed: the run starts again
      ...week("2026-08-24", 2),
      ...week("2026-08-31", 3),
      ...week("2026-09-07", 2),
    ];
    expect(stateOf("full_weeks", sessions).value).toBe(3);
    expect(stateOf("full_weeks", sessions, { weeklyTarget: 1 }).value).toBe(6);
  });

  it("early bird: sessions started between 4:00 and 7:00, local time", () => {
    const at = (hour: number) => {
      const start = new Date(2026, 8, 1, hour, 30);
      return done({ startedAt: start.toISOString() });
    };
    const sessions = [at(5), at(6), at(7), at(2), done({ startedAt: null })];
    expect(stateOf("early_bird", sessions).value).toBe(2);
  });
});

describe("progress and unlocks to store", () => {
  it("knows the next level and never goes below a stored one", () => {
    const iron = achievementByKey("iron") as Achievement;
    expect(progressOf(iron, 37)).toEqual({ tier: 1, value: 37, next: 50, fraction: 0.74 });
    expect(progressOf(iron, 600)).toMatchObject({ tier: 5, next: null, fraction: 1 });
    // Sessions deleted after reaching level 2: the level stays.
    expect(progressOf(iron, 12, 2)).toMatchObject({ tier: 2, next: 100 });
  });

  it("returns only the levels not stored yet", () => {
    const states = evaluateAchievements([done({ records: 12 })], options);
    const fresh = newUnlocks(states, [{ achievement_key: "records", tier: 1 }]);
    expect(fresh.map((u) => `${u.key}:${u.tier}`)).toEqual(["first_session:1", "records:2"]);
  });

  it("colours levels bronze → diamond, single-level ones gold", () => {
    const iron = achievementByKey("iron") as Achievement;
    expect([1, 2, 3, 4, 5].map((tier) => tierTone(iron, tier))).toEqual(["bronze", "silver", "gold", "platinum", "diamond"]);
    expect(tierTone(achievementByKey("first_session") as Achievement, 1)).toBe("gold");
    expect(tierTone(iron, 0)).toBe("locked");
  });
});

describe("highlights", () => {
  let n = 0;
  const row = (key: string, tier: number, unlocked: string, featured: number | null = null): UserAchievement => {
    n += 1;
    return {
      id: `a${n}`,
      user_id: USER,
      achievement_key: key,
      tier,
      unlocked_at: unlocked,
      session_id: null,
      seen_at: null,
      featured_position: featured,
      created_at: unlocked,
      updated_at: unlocked,
      deleted_at: null,
    };
  };

  it("shows the latest ones until you choose", () => {
    const rows = [
      row("iron", 1, "2026-01-01"),
      row("iron", 2, "2026-06-01"),
      row("records", 1, "2026-03-01"),
      row("first_session", 1, "2025-12-01"),
    ];
    expect(highlights(rows)).toEqual(["iron", "records", "first_session"]);
  });

  it("pins at the end and unpins, keeping positions 0, 1, 2…", () => {
    let rows = [row("iron", 1, "2026-01-01"), row("iron", 2, "2026-06-01"), row("records", 1, "2026-03-01"), row("tonnes", 1, "2026-04-01")];
    const apply = (changes: UserAchievement[]) => {
      rows = rows.map((r) => changes.find((c) => c.id === r.id) ?? r);
    };
    apply(toggleFeatured(rows, "records"));
    apply(toggleFeatured(rows, "iron"));
    apply(toggleFeatured(rows, "tonnes"));
    expect(highlights(rows)).toEqual(["records", "iron", "tonnes"]);
    // Iron's best level holds the pin.
    expect(rows.find((r) => r.achievement_key === "iron" && r.tier === 2)?.featured_position).toBe(1);

    apply(toggleFeatured(rows, "records"));
    expect(highlights(rows)).toEqual(["iron", "tonnes"]);
    expect(rows.map((r) => r.featured_position)).toEqual([null, 0, null, 1]);
    expect(toggleFeatured(rows, "balboa")).toEqual([]);
  });
});
