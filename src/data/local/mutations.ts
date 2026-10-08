import { type RowOf, SYNC_TABLES, type SyncTable } from "@/data/sync/tables";
import type { LocalDb } from "./db";

type Listener = () => void;
const listeners = new Set<Listener>();

/** Lets the sync runner know there is something new to upload. */
export function onLocalWrite(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Rows to write, grouped by table. */
export type Changes = { [T in SyncTable]?: RowOf<T>[] };

/**
 * The only way the app writes data: stores the rows locally and queues them for
 * upload in the same transaction, so a change can never be lost or left unsynced.
 * Several tables are written atomically (a routine with its days and exercises).
 */
export async function saveChanges(db: LocalDb, changes: Changes): Promise<void> {
  const tables = SYNC_TABLES.filter((table) => (changes[table]?.length ?? 0) > 0);
  if (tables.length === 0) return;
  const queuedAt = new Date().toISOString();
  await db.transaction("rw", [...tables.map((table) => db.table(table)), db.outbox], async () => {
    for (const table of tables) {
      const rows = changes[table] ?? [];
      // Local timestamp until the server assigns the real one on upload.
      await db.table(table).bulkPut(rows.map((row) => ({ ...row, updated_at: queuedAt })));
      await db.outbox.bulkAdd(rows.map((row) => ({ table, row_id: row.id, queued_at: queuedAt })));
    }
  });
  for (const listener of listeners) listener();
}

export async function saveRows<T extends SyncTable>(db: LocalDb, table: T, rows: RowOf<T>[]): Promise<void> {
  await saveChanges(db, { [table]: rows } as Changes);
}
