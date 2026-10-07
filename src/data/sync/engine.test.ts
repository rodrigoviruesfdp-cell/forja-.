import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "@/data/local/db";
import { getMeta, META_KEYS } from "@/data/local/meta";
import { saveRows } from "@/data/local/mutations";
import type { Profile, Routine } from "@/domain/schemas";
import { SyncEngine } from "./engine";
import { FakeRemote } from "./fake-remote";
import type { Row } from "./remote";

const USER = "11111111-1111-4111-8111-111111111111";
let dbCounter = 0;

function routine(id: string, name: string): Routine {
  return {
    id,
    user_id: USER,
    name,
    schedule_type: "rotation",
    training_weekdays: [],
    weekly_target: null,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
  };
}

function profile(patch: Partial<Profile> = {}): Profile {
  return {
    id: USER,
    display_name: "Yo",
    goal: null,
    level: null,
    units: "kg",
    locale: "es",
    injury_notes: null,
    active_routine_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

describe("SyncEngine", () => {
  let db: LocalDb;
  let remote: FakeRemote;
  let engine: SyncEngine;

  beforeEach(async () => {
    db = new LocalDb(`test-${++dbCounter}`);
    await db.open();
    remote = new FakeRemote();
    engine = new SyncEngine(db, remote);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("pushes local writes and empties the outbox", async () => {
    await saveRows(db, "routines", [routine("r1", "A/B/C/D")]);
    expect(await db.outbox.count()).toBe(1);

    const result = await engine.sync();

    expect(result.pushed).toBe(1);
    expect(await db.outbox.count()).toBe(0);
    expect(remote.table("routines").get("r1")?.name).toBe("A/B/C/D");
  });

  it("uploads only the latest version of a row edited several times", async () => {
    await saveRows(db, "routines", [routine("r1", "v1")]);
    await saveRows(db, "routines", [routine("r1", "v2")]);
    await saveRows(db, "routines", [routine("r1", "v3")]);

    await engine.push();

    expect(remote.upsertCalls).toEqual([{ table: "routines", ids: ["r1"] }]);
    expect(remote.table("routines").get("r1")?.name).toBe("v3");
  });

  it("pushes parents before children (routine before the profile that activates it)", async () => {
    await saveRows(db, "profiles", [profile({ active_routine_id: "r1" })]);
    await saveRows(db, "routines", [routine("r1", "Mi rutina")]);

    await engine.push();

    expect(remote.upsertCalls.map((c) => c.table)).toEqual(["routines", "profiles"]);
  });

  it("keeps the outbox when offline and sends it once back online", async () => {
    remote.offline = true;
    await saveRows(db, "routines", [routine("r1", "Sin cobertura")]);

    await expect(engine.sync()).rejects.toThrow("offline");
    expect(await db.outbox.count()).toBe(1);

    remote.offline = false;
    await engine.sync();
    expect(await db.outbox.count()).toBe(0);
    expect(remote.table("routines").has("r1")).toBe(true);
  });

  it("pulls rows written by another device", async () => {
    remote.serverWrite("routines", routine("r2", "Desde el portátil"));

    const result = await engine.sync();

    expect(result.pulled).toBe(1);
    expect((await db.routines.get("r2"))?.name).toBe("Desde el portátil");
    expect(await getMeta(db, META_KEYS.initialSyncDone)).toBe(true);
  });

  it("does not overwrite a local change that is still pending", async () => {
    remote.serverWrite("routines", routine("r1", "Servidor"));
    await engine.sync();

    remote.offline = true;
    await saveRows(db, "routines", [routine("r1", "Editado en el gimnasio")]);
    remote.offline = false;
    remote.serverWrite("routines", routine("r1", "Otro dispositivo"));

    // Pull alone (no push): the pending local edit must survive.
    await engine.pull();
    expect((await db.routines.get("r1"))?.name).toBe("Editado en el gimnasio");

    // Full sync: local edit is pushed last, so it wins.
    await engine.sync();
    expect(remote.table("routines").get("r1")?.name).toBe("Editado en el gimnasio");
    expect((await db.routines.get("r1"))?.name).toBe("Editado en el gimnasio");
  });

  it("pages through large tables, including many rows with the same timestamp", async () => {
    const stamp = remote.tick();
    for (let i = 0; i < 2500; i++) {
      const id = `ex-${String(i).padStart(5, "0")}`;
      remote.table("exercises").set(id, { id, name: `E${i}`, updated_at: stamp } as Row);
    }

    const pulled = await engine.pull();

    expect(pulled).toBe(2500);
    expect(await db.exercises.count()).toBe(2500);
  });

  it("re-reads a small overlap so late commits are never missed", async () => {
    remote.serverWrite("routines", routine("r1", "Primera"));
    await engine.sync();

    // A row committed late with an older timestamp than the cursor (within the overlap).
    const cursor = await getMeta<{ updatedAt: string }>(db, META_KEYS.pullCursor("routines"));
    const lateStamp = new Date(Date.parse(cursor!.updatedAt) - 1000).toISOString();
    remote.table("routines").set("late", { ...routine("late", "Tardía"), updated_at: lateStamp });

    await engine.pull();
    expect((await db.routines.get("late"))?.name).toBe("Tardía");
  });

  it("isolates a rejected row, keeps it flagged and lets the rest through", async () => {
    remote.rejectWhen = (_table, row) => (row.name === "Mala" ? "violates check constraint" : null);
    await saveRows(db, "routines", [routine("ok1", "Buena"), routine("bad", "Mala"), routine("ok2", "Otra")]);

    const result = await engine.push();

    expect(result).toEqual({ pushed: 2, rejected: 1 });
    expect(remote.table("routines").has("ok1")).toBe(true);
    expect(remote.table("routines").has("ok2")).toBe(true);
    const rejected = await engine.rejectedChanges();
    expect(rejected.map((e) => [e.row_id, e.error])).toEqual([["bad", "violates check constraint"]]);

    // A flagged row is not retried on every sync...
    remote.upsertCalls = [];
    await engine.push();
    expect(remote.upsertCalls).toEqual([]);

    // ...and can be discarded, which removes it locally since the server never had it.
    await engine.discardRejected("routines", "bad");
    expect(await db.routines.get("bad")).toBeUndefined();
    expect(await engine.rejectedChanges()).toEqual([]);
  });

  it("clears an old rejection once the row is fixed and accepted", async () => {
    remote.rejectWhen = (_table, row) => (row.name === "Mala" ? "violates check constraint" : null);
    await saveRows(db, "routines", [routine("r1", "Mala")]);
    await engine.push();
    expect(await engine.rejectedChanges()).toHaveLength(1);

    await saveRows(db, "routines", [routine("r1", "Arreglada")]);
    await engine.push();

    expect(await engine.rejectedChanges()).toEqual([]);
    expect(await db.outbox.count()).toBe(0);
    expect(remote.table("routines").get("r1")?.name).toBe("Arreglada");
  });

  it("shares one run between concurrent sync calls", async () => {
    await saveRows(db, "routines", [routine("r1", "Una vez")]);
    await Promise.all([engine.sync(), engine.sync(), engine.sync()]);
    expect(remote.upsertCalls).toHaveLength(1);
  });

  it("does not upload server-managed columns", async () => {
    await saveRows(db, "routines", [routine("r1", "X")]);
    let uploaded: Row | undefined;
    const original = remote.upsert.bind(remote);
    remote.upsert = async (table, rows) => {
      uploaded = rows[0];
      return original(table, rows);
    };
    await engine.push();
    expect(uploaded).toBeDefined();
    expect(uploaded).not.toHaveProperty("updated_at");
  });
});
