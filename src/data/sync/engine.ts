import type { LocalDb, OutboxEntry } from "@/data/local/db";
import { getMeta, META_KEYS, setMeta } from "@/data/local/meta";
import { type PullCursor, RemoteError, type RemoteAdapter, type Row } from "./remote";
import { COLUMN_DEFAULTS, SERVER_MANAGED_COLUMNS, SYNC_TABLES, type SyncTable } from "./tables";

/**
 * Re-read this much history on every pull. A write that committed slightly after
 * a later one (or a device with a skewed clock) can never be skipped.
 * Re-applying rows is harmless: they are upserts by id.
 */
export const PULL_OVERLAP_MS = 2 * 60 * 1000;
export const PULL_PAGE_SIZE = 1000;

export interface SyncResult {
  pushed: number;
  rejected: number;
  pulled: number;
}

export interface SyncEngineOptions {
  now?: () => Date;
}

export class SyncEngine {
  private running: Promise<SyncResult> | null = null;
  private readonly now: () => Date;

  constructor(
    private readonly db: LocalDb,
    private readonly remote: RemoteAdapter,
    options: SyncEngineOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
  }

  /** Push local changes, then pull remote ones. Concurrent calls share the same run. */
  sync(): Promise<SyncResult> {
    if (!this.running) {
      this.running = this.runOnce().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async runOnce(): Promise<SyncResult> {
    const { pushed, rejected } = await this.push();
    const pulled = await this.pull();
    await setMeta(this.db, META_KEYS.lastSyncedAt, this.now().toISOString());
    await setMeta(this.db, META_KEYS.initialSyncDone, true);
    return { pushed, rejected, pulled };
  }

  /**
   * Uploads every pending row (its current local version), table by table in FK order.
   * Network/auth failures abort and keep the outbox for the next attempt.
   */
  async push(): Promise<{ pushed: number; rejected: number }> {
    const entries = (await this.db.outbox.orderBy("seq").toArray()).filter((e) => !e.error);
    if (entries.length === 0) return { pushed: 0, rejected: 0 };

    const maxSeq = entries[entries.length - 1]!.seq!;
    let pushed = 0;
    let rejected = 0;

    for (const table of SYNC_TABLES) {
      const ids = [...new Set(entries.filter((e) => e.table === table).map((e) => e.row_id))];
      if (ids.length === 0) continue;

      const rows = (await this.db.table(table).bulkGet(ids)).filter(Boolean).map((row) => toUploadRow(table, row));
      const rejectedIds = await this.uploadTable(table, rows);
      pushed += rows.length - rejectedIds.size;
      rejected += rejectedIds.size;

      const uploaded = new Set(ids);
      await this.db.transaction("rw", this.db.outbox, async () => {
        // Includes older entries of the same rows that had been rejected: the new upload supersedes them.
        const done = await this.db.outbox
          .where("table")
          .equals(table)
          .filter((e) => e.seq! <= maxSeq && uploaded.has(e.row_id))
          .toArray();
        for (const entry of done) {
          const error = rejectedIds.get(entry.row_id);
          if (error) await this.db.outbox.update(entry.seq!, { error });
          else await this.db.outbox.delete(entry.seq!);
        }
      });
    }

    return { pushed, rejected };
  }

  /** Returns the rows the server rejected (id -> reason). Throws on network/auth errors. */
  private async uploadTable(table: SyncTable, rows: Row[]): Promise<Map<string, string>> {
    const rejected = new Map<string, string>();
    if (rows.length === 0) return rejected;
    try {
      await this.remote.upsert(table, rows);
      return rejected;
    } catch (error) {
      if (!(error instanceof RemoteError) || error.kind !== "rejected") throw error;
    }
    // One bad row must not block the rest: retry one by one to isolate it.
    for (const row of rows) {
      try {
        await this.remote.upsert(table, [row]);
      } catch (error) {
        if (error instanceof RemoteError && error.kind === "rejected") {
          rejected.set(row.id, error.message);
        } else {
          throw error;
        }
      }
    }
    return rejected;
  }

  /** Downloads rows changed since the last pull. Local rows with pending changes are kept. */
  async pull(): Promise<number> {
    let total = 0;
    for (const table of SYNC_TABLES) {
      total += await this.pullTable(table);
    }
    return total;
  }

  private async pullTable(table: SyncTable): Promise<number> {
    const cursorKey = META_KEYS.pullCursor(table);
    const saved = await getMeta<PullCursor>(this.db, cursorKey);
    let after: PullCursor | null = saved ? rewind(saved, PULL_OVERLAP_MS) : null;
    let total = 0;

    for (;;) {
      const rows = await this.remote.pull(table, after, PULL_PAGE_SIZE);
      if (rows.length === 0) break;

      await this.db.transaction("rw", this.db.table(table), this.db.outbox, this.db.meta, async () => {
        const pending = new Set(
          (await this.db.outbox.where("table").equals(table).toArray()).map((e) => e.row_id),
        );
        const fresh = rows.filter((row) => !pending.has(row.id));
        await this.db.table(table).bulkPut(fresh);
        const last = rows[rows.length - 1]!;
        after = { updatedAt: last.updated_at, id: last.id };
        // Never move the saved cursor backwards (the overlap re-reads older rows).
        if (!saved || compareCursor(after, saved) > 0) await setMeta(this.db, cursorKey, after);
      });

      total += rows.length;
      if (rows.length < PULL_PAGE_SIZE) break;
    }
    return total;
  }

  /** Pending changes the server refused, so the UI can show and discard them. */
  async rejectedChanges(): Promise<OutboxEntry[]> {
    return this.db.outbox.filter((e) => Boolean(e.error)).toArray();
  }

  /** Drops a refused change and restores the server's version of that row (or removes it locally). */
  async discardRejected(table: SyncTable, rowId: string): Promise<void> {
    const serverRow = await this.remote.fetchRow(table, rowId);
    await this.db.transaction("rw", this.db.table(table), this.db.outbox, async () => {
      await this.db.outbox.where("[table+row_id]").equals([table, rowId]).delete();
      if (serverRow) await this.db.table(table).put(serverRow);
      else await this.db.table(table).delete(rowId);
    });
  }
}

function toUploadRow(table: SyncTable, row: Row): Row {
  const copy: Record<string, unknown> = { ...COLUMN_DEFAULTS[table], ...row };
  for (const column of SERVER_MANAGED_COLUMNS) delete copy[column];
  return copy as Row;
}

function rewind(cursor: PullCursor, ms: number): PullCursor {
  const time = Date.parse(cursor.updatedAt);
  if (Number.isNaN(time)) return cursor;
  // id "" sorts before every uuid, so rows at exactly that instant are included.
  return { updatedAt: new Date(time - ms).toISOString(), id: "" };
}

function compareCursor(a: PullCursor, b: PullCursor): number {
  const byTime = Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
  if (byTime !== 0) return byTime;
  // Same millisecond: fall back to the raw string (microseconds) and then the id.
  if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? -1 : 1;
  return a.id === b.id ? 0 : a.id < b.id ? -1 : 1;
}
