import type { SyncTable } from "./tables";

export type Row = Record<string, unknown> & { id: string; updated_at: string };

/** Position in a table's change feed: rows are ordered by (updated_at, id). */
export interface PullCursor {
  updatedAt: string;
  id: string;
}

export type RemoteErrorKind =
  /** No connection or the server could not be reached: retry later. */
  | "network"
  /** Session expired or missing: retry once auth is refreshed. */
  | "auth"
  /** The server refused this data (constraint, permissions). Retrying will not help. */
  | "rejected";

export class RemoteError extends Error {
  constructor(
    readonly kind: RemoteErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "RemoteError";
  }
}

/** What the sync engine needs from the server. Supabase in production, an in-memory fake in tests. */
export interface RemoteAdapter {
  /** Inserts or updates rows by id. Throws RemoteError. */
  upsert(table: SyncTable, rows: Row[]): Promise<void>;
  /** Rows changed after `after` (exclusive), oldest first. Throws RemoteError. */
  pull(table: SyncTable, after: PullCursor | null, limit: number): Promise<Row[]>;
  /** One row by id, or null if it does not exist (used to recover from rejected changes). */
  fetchRow(table: SyncTable, id: string): Promise<Row | null>;
}
