import type { RowOf, SyncTable } from "@/data/sync/tables";
import type { LocalDb } from "./db";

type Listener = () => void;
const listeners = new Set<Listener>();

/** Lets the sync runner know there is something new to upload. */
export function onLocalWrite(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The only way the app writes data: stores the rows locally and queues them for
 * upload in the same transaction, so a change can never be lost or left unsynced.
 */
export async function saveRows<T extends SyncTable>(db: LocalDb, table: T, rows: RowOf<T>[]): Promise<void> {
  if (rows.length === 0) return;
  const queuedAt = new Date().toISOString();
  // Local timestamp until the server assigns the real one on upload.
  const stamped = rows.map((row) => ({ ...row, updated_at: queuedAt }));
  await db.transaction("rw", db.table(table), db.outbox, async () => {
    await db.table(table).bulkPut(stamped);
    await db.outbox.bulkAdd(rows.map((row) => ({ table, row_id: row.id, queued_at: queuedAt })));
  });
  for (const listener of listeners) listener();
}
