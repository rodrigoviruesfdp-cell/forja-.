import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "@/data/local/db";
import { getMeta, META_KEYS } from "@/data/local/meta";
import { SyncEngine } from "@/data/sync/engine";
import { templateSourceIds } from "@/domain/routines/templates";
import type { Exercise, Profile } from "@/domain/schemas";
import { createDemo, demoDbName, LocalOnlyRemote } from "./demo";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-10-07T10:00:00.000Z";

const profile: Profile = {
  id: USER,
  display_name: "Yo",
  goal: null,
  level: null,
  units: "kg",
  locale: "es",
  injury_notes: null,
  active_routine_id: null,
  username: null,
  bio: null,
  avatar_url: null,
  is_private: true,
  created_at: NOW,
  updated_at: NOW,
};

const catalog: Exercise[] = templateSourceIds().map((sourceId, index) => ({
  id: `cccccccc-0000-4000-8000-${String(index).padStart(12, "0")}`,
  created_by: null,
  source_id: sourceId,
  name: sourceId,
  translations: {},
  primary_muscle: "chest",
  secondary_muscles: [],
  equipment: null,
  category: "strength",
  mechanic: null,
  instructions: [],
  image_urls: [],
  created_at: NOW,
  updated_at: NOW,
  deleted_at: null,
}));

const labels = { names: { routine: "Rutina de ejemplo", day: (key: string) => key }, sportName: (sport: string) => sport, unit: "kg" as const };

let real: LocalDb;
let demo: LocalDb;

beforeEach(async () => {
  real = new LocalDb(`forja-${USER}`);
  await real.exercises.bulkPut(catalog);
  await real.profiles.put(profile);
  demo = new LocalDb(demoDbName(USER));
});

afterEach(async () => {
  await real.delete();
  await demo.delete();
});

describe("sample data database", () => {
  it("is built apart from yours, ready to open and with nothing to upload", async () => {
    await createDemo(real, USER, labels);
    await demo.open();

    expect(await demo.exercises.count()).toBe(catalog.length);
    const routine = await demo.routines.toCollection().first();
    expect((await demo.profiles.get(USER))?.active_routine_id).toBe(routine?.id);
    expect(await demo.sessions.count()).toBeGreaterThan(50);
    expect(await demo.session_sets.filter((set) => set.is_pr).count()).toBeGreaterThan(10);
    expect(await getMeta(demo, META_KEYS.initialSyncDone)).toBe(true);
    expect(await demo.outbox.count()).toBe(0);

    // Achievements of the sample are there, already seen: no round of celebrations.
    const achievements = await demo.user_achievements.toArray();
    expect(achievements.length).toBeGreaterThan(3);
    expect(achievements.every((row) => row.seen_at !== null)).toBe(true);

    // Yours: untouched.
    expect(await real.sessions.count()).toBe(0);
    expect(await real.outbox.count()).toBe(0);
    expect((await real.profiles.get(USER))?.active_routine_id).toBeNull();
  });

  it("starts from scratch every time", async () => {
    await createDemo(real, USER, labels);
    await createDemo(real, USER, labels);
    await demo.open();
    expect(await demo.routines.count()).toBe(1);
  });

  it("syncs to nowhere: what you do in it stays on the phone", async () => {
    await createDemo(real, USER, labels);
    await demo.open();
    const session = await demo.sessions.toCollection().first();
    await demo.outbox.add({ table: "sessions", row_id: session?.id ?? "", queued_at: NOW });
    await new SyncEngine(demo, new LocalOnlyRemote()).sync();
    expect(await demo.outbox.count()).toBe(0);
    expect(await demo.sessions.count()).toBeGreaterThan(50);
  });
});
