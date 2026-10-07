import type { LocalDb } from "./db";

export async function getMeta<T>(db: LocalDb, key: string): Promise<T | undefined> {
  const entry = await db.meta.get(key);
  return entry?.value as T | undefined;
}

export async function setMeta(db: LocalDb, key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export const META_KEYS = {
  initialSyncDone: "initialSyncDone",
  lastSyncedAt: "lastSyncedAt",
  pullCursor: (table: string) => `pullCursor:${table}`,
} as const;
