import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "@/data/local/db";
import { addProgressPhoto, bodyWeightOn, deleteProgressPhoto } from "@/data/repositories/photos";
import { RemoteError } from "@/data/sync/remote";
import { MediaSync } from "./media-sync";
import type { MediaRemote } from "./remote";

const USER = "11111111-1111-4111-8111-111111111111";

class FakeStorage implements MediaRemote {
  files = new Map<string, Blob>();
  offline = false;
  uploads = 0;
  async upload(path: string, file: Blob) {
    if (this.offline) throw new RemoteError("network", "offline");
    this.uploads += 1;
    this.files.set(path, file);
  }
  async remove(paths: string[]) {
    if (this.offline) throw new RemoteError("network", "offline");
    for (const path of paths) this.files.delete(path);
  }
  async download(path: string) {
    if (this.offline) throw new RemoteError("network", "offline");
    return this.files.get(path) ?? null;
  }
}

const blob = (text: string) => new Blob([text], { type: "image/jpeg" });
let db: LocalDb;
let storage: FakeStorage;
let media: MediaSync;

beforeEach(() => {
  db = new LocalDb(`media-${crypto.randomUUID()}`);
  storage = new FakeStorage();
  media = new MediaSync(db, storage);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const add = (weightKg: number | null = null, takenAt = "2026-10-09") =>
  addProgressPhoto(db, USER, { full: blob("full"), thumb: blob("thumb"), width: 1200, height: 1600, takenAt, pose: "front", weightKg });

describe("progress photos on the phone and in Storage", () => {
  it("keeps the files until they are uploaded, once", async () => {
    const row = await add();
    expect(await db.outbox.where("table").equals("media").count()).toBe(1);
    expect((await db.media_files.get(row.id))?.uploaded).toBe(0);

    storage.offline = true;
    await expect(media.uploadPending()).rejects.toThrow("offline");
    expect((await db.media_files.get(row.id))?.uploaded).toBe(0);

    storage.offline = false;
    expect(await media.uploadPending()).toBe(1);
    expect([...storage.files.keys()]).toEqual([row.storage_path, row.thumb_path]);
    expect(await media.uploadPending()).toBe(0);
    expect(storage.uploads).toBe(2);
  });

  it("notes that day's body weight, updating the day if it had one", async () => {
    await add(80.5, "2026-10-01");
    await add(79.8, "2026-10-01");
    expect((await bodyWeightOn(db, "2026-10-01"))?.body_weight_kg).toBe(79.8);
    expect(await db.body_metrics.count()).toBe(1);
  });

  it("downloads a photo from another phone once and keeps it", async () => {
    const row = await add();
    await media.uploadPending();
    await db.media_files.clear();
    expect(await media.blob(row, "thumb")).not.toBeNull();
    storage.offline = true;
    expect(await (await media.blob(row, "thumb"))?.text()).toBe("thumb");
    expect(await media.blob(row, "full")).toBeNull();
  });

  it("deleting removes the files here now and in Storage on the next sync", async () => {
    const row = await add();
    await media.uploadPending();
    await deleteProgressPhoto(db, row);
    expect(await db.media_files.get(row.id)).toBeUndefined();
    expect((await db.media.get(row.id))?.deleted_at).not.toBeNull();
    await media.beforeSync();
    expect(storage.files.size).toBe(0);
    expect(await db.media_removals.count()).toBe(0);
  });

  it("drops local copies of photos deleted on another phone", async () => {
    const row = await add();
    await media.uploadPending();
    await db.media.put({ ...row, deleted_at: "2026-10-09T12:00:00Z" });
    await media.afterSync();
    expect(await db.media_files.get(row.id)).toBeUndefined();
  });
});
