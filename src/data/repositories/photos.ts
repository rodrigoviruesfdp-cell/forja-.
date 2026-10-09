import type { LocalDb } from "@/data/local/db";
import { saveChanges } from "@/data/local/mutations";
import { newProgressPhoto } from "@/domain/photos";
import type { BodyMetric, Media, Pose } from "@/domain/schemas";

function clock() {
  return { now: new Date().toISOString(), newId: () => crypto.randomUUID() };
}

/** Your body weight on a day (the latest entry of that day), if you noted one. */
export async function bodyWeightOn(db: LocalDb, date: string): Promise<BodyMetric | undefined> {
  const rows = (await db.body_metrics.where("date").equals(date).toArray()).filter((row) => !row.deleted_at);
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
}

/** The body weight of that day: updates the day's entry or adds one (null leaves it as it was). */
async function weightChanges(db: LocalDb, userId: string, date: string, weightKg: number | null): Promise<BodyMetric[]> {
  if (weightKg === null) return [];
  const existing = await bodyWeightOn(db, date);
  const now = new Date().toISOString();
  if (existing) return existing.body_weight_kg === weightKg ? [] : [{ ...existing, body_weight_kg: weightKg }];
  return [{ id: crypto.randomUUID(), user_id: userId, date, body_weight_kg: weightKg, notes: null, created_at: now, updated_at: now, deleted_at: null }];
}

export interface NewPhoto {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  takenAt: string;
  pose: Pose | null;
  /** Body weight that day, in kg (optional). */
  weightKg: number | null;
}

/**
 * Saves a progress photo: its row (synced like any other) and its files, kept on the phone
 * until MediaSync has uploaded them. All in one transaction.
 */
export async function addProgressPhoto(db: LocalDb, userId: string, photo: NewPhoto): Promise<Media> {
  const row = newProgressPhoto(userId, { takenAt: photo.takenAt, pose: photo.pose, width: photo.width, height: photo.height }, clock());
  const weights = await weightChanges(db, userId, photo.takenAt, photo.weightKg);
  await db.transaction("rw", [db.media, db.body_metrics, db.outbox, db.media_files], async () => {
    await db.media_files.put({ id: row.id, full: photo.full, thumb: photo.thumb, uploaded: 0 });
    await saveChanges(db, { media: [row], body_metrics: weights });
  });
  return row;
}

/** Changes the day or the pose of a photo (and that day's body weight). */
export async function updateProgressPhoto(
  db: LocalDb,
  userId: string,
  row: Media,
  patch: { takenAt: string; pose: Pose | null; weightKg: number | null },
): Promise<void> {
  const weights = await weightChanges(db, userId, patch.takenAt, patch.weightKg);
  await saveChanges(db, { media: [{ ...row, taken_at: patch.takenAt, pose: patch.pose }], body_metrics: weights });
}

/**
 * Deletes a photo for good: the row is marked deleted (other phones drop their copy), the files
 * leave this phone now and Storage on the next sync.
 */
export async function deleteProgressPhoto(db: LocalDb, row: Media): Promise<void> {
  const now = new Date().toISOString();
  const paths = [row.storage_path, row.thumb_path].filter((path): path is string => !!path);
  await db.transaction("rw", [db.media, db.outbox, db.media_files, db.media_removals], async () => {
    await saveChanges(db, { media: [{ ...row, deleted_at: now }] });
    await db.media_files.delete(row.id);
    await db.media_removals.bulkPut(paths.map((path) => ({ path, queued_at: now })));
  });
}
