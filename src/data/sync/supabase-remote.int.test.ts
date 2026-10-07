/**
 * Integration test against a local Supabase (npx supabase start + db reset).
 * Skipped unless SUPABASE_TEST_URL, SUPABASE_TEST_KEY and SUPABASE_TEST_SECRET are set:
 *   SUPABASE_TEST_URL=http://127.0.0.1:54321 SUPABASE_TEST_KEY=<publishable> SUPABASE_TEST_SECRET=<secret> npm test
 */
import "fake-indexeddb/auto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LocalDb } from "@/data/local/db";
import { saveRows } from "@/data/local/mutations";
import type { Profile, Routine } from "@/domain/schemas";
import { SyncEngine } from "./engine";
import { RemoteError } from "./remote";
import { SupabaseRemote } from "./supabase-remote";

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_KEY;
const secret = process.env.SUPABASE_TEST_SECRET;

describe.skipIf(!url || !key || !secret)("SupabaseRemote (local Supabase)", () => {
  const email = `sync-${Date.now()}@example.com`;
  const password = "test-password-123";
  let userId = "";
  let remote: SupabaseRemote;
  let db: LocalDb;

  beforeAll(async () => {
    const admin = createClient(url!, secret!, { auth: { persistSession: false } });
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;

    const client = createClient(url!, key!, { auth: { persistSession: false } });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;

    remote = new SupabaseRemote(client);
    db = new LocalDb(`int-${Date.now()}`);
    await db.open();
  });

  afterAll(async () => {
    await db?.delete();
    if (userId) {
      const admin = createClient(url!, secret!, { auth: { persistSession: false } });
      await admin.auth.admin.deleteUser(userId);
    }
  });

  function routine(name: string, patch: Partial<Routine> = {}): Routine {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      schedule_type: "rotation",
      training_weekdays: [0, 1, 3, 4],
      weekly_target: 5,
      notes: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      ...patch,
    };
  }

  it("round-trips local writes through Postgres with RLS", async () => {
    const engine = new SyncEngine(db, remote);
    const first = await engine.sync();
    expect(first.pulled).toBeGreaterThanOrEqual(1); // the auto-created profile

    const profile = (await db.profiles.get(userId)) as Profile;
    expect(profile.locale).toBe("es");

    const r = routine("A/B/C/D + fútbol");
    await saveRows(db, "routines", [r]);
    await saveRows(db, "profiles", [{ ...profile, active_routine_id: r.id, units: "lb", locale: "en" }]);
    const result = await engine.sync();

    expect(result.pushed).toBe(2);
    expect(result.rejected).toBe(0);
    const server = await remote.fetchRow("profiles", userId);
    expect(server).toMatchObject({ active_routine_id: r.id, units: "lb", locale: "en" });
    expect(await db.outbox.count()).toBe(0);
  });

  it("classifies constraint violations as rejected", async () => {
    const bad = routine("Mala", { weekly_target: 99 });
    await expect(remote.upsert("routines", [bad])).rejects.toMatchObject({ kind: "rejected" });
  });

  it("classifies writes to another user's rows as rejected (RLS)", async () => {
    const forged = routine("Ajena", { user_id: "22222222-2222-4222-8222-222222222222" });
    const error = await remote.upsert("routines", [forged]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RemoteError);
    expect((error as RemoteError).kind).toBe("rejected");
  });

  it("pulls incrementally with the overlap cursor", async () => {
    const engine = new SyncEngine(db, remote);
    const before = await engine.pull();
    // Everything is within the 2-minute overlap, so it is re-read (idempotent).
    expect(before).toBeGreaterThanOrEqual(2);
    expect(await db.routines.count()).toBe(1);
  });
});
