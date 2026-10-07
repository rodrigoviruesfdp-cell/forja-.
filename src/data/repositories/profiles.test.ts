import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { LocalDb } from "@/data/local/db";
import type { Profile } from "@/domain/schemas";
import { normalizeUsername, updateProfile } from "./profiles";

describe("updateProfile", () => {
  const db = new LocalDb("profiles-test");
  afterEach(async () => {
    await db.delete();
  });

  it("upgrades a profile stored before the public-identity columns existed", async () => {
    const legacy = {
      id: "11111111-1111-4111-8111-111111111111",
      display_name: "Yo",
      goal: null,
      level: null,
      units: "kg",
      locale: "es",
      injury_notes: null,
      active_routine_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } as unknown as Profile;

    const next = await updateProfile(db, legacy, { username: "rodrigo" });

    expect(next).toMatchObject({ username: "rodrigo", bio: null, avatar_url: null, is_private: true });
    expect(await db.outbox.count()).toBe(1);
  });

  it("rejects usernames the database would refuse", async () => {
    const profile = {
      id: "11111111-1111-4111-8111-111111111111",
      display_name: null, goal: null, level: null, units: "kg", locale: "es", injury_notes: null,
      active_routine_id: null, username: null, bio: null, avatar_url: null, is_private: true,
      created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
    } satisfies Profile;
    await expect(updateProfile(db, profile, { username: "No Válido!" })).rejects.toThrow();
  });
});

describe("normalizeUsername", () => {
  it("drops the @ and lowercases", () => {
    expect(normalizeUsername("  @Rodrigo.Lifts ")).toBe("rodrigo.lifts");
  });
});
