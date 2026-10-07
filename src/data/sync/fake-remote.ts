import { type PullCursor, RemoteError, type RemoteAdapter, type Row } from "./remote";
import type { SyncTable } from "./tables";

/**
 * In-memory server for tests: assigns updated_at on write like the real trigger,
 * and can simulate outages or rejected rows.
 */
export class FakeRemote implements RemoteAdapter {
  readonly tables = new Map<SyncTable, Map<string, Row>>();
  offline = false;
  rejectWhen: (table: SyncTable, row: Row) => string | null = () => null;
  upsertCalls: { table: SyncTable; ids: string[] }[] = [];
  private clock = Date.parse("2026-01-01T00:00:00Z");

  /** Server time advances 1 ms per write so ordering is deterministic. */
  tick(): string {
    this.clock += 1;
    return new Date(this.clock).toISOString();
  }

  table(name: SyncTable): Map<string, Row> {
    let table = this.tables.get(name);
    if (!table) {
      table = new Map();
      this.tables.set(name, table);
    }
    return table;
  }

  /** Writes a row as if another device had pushed it. */
  serverWrite(name: SyncTable, row: Omit<Row, "updated_at">): Row {
    const stored = { ...row, updated_at: this.tick() } as Row;
    this.table(name).set(stored.id, stored);
    return stored;
  }

  async upsert(name: SyncTable, rows: Row[]): Promise<void> {
    if (this.offline) throw new RemoteError("network", "offline");
    this.upsertCalls.push({ table: name, ids: rows.map((r) => r.id) });
    for (const row of rows) {
      const reason = this.rejectWhen(name, row);
      if (reason) throw new RemoteError("rejected", reason);
    }
    for (const row of rows) this.serverWrite(name, row);
  }

  async pull(name: SyncTable, after: PullCursor | null, limit: number): Promise<Row[]> {
    if (this.offline) throw new RemoteError("network", "offline");
    return [...this.table(name).values()]
      .filter((row) => !after || isAfter(row, after))
      .sort((a, b) => (a.updated_at === b.updated_at ? cmp(a.id, b.id) : cmp(a.updated_at, b.updated_at)))
      .slice(0, limit);
  }

  async fetchRow(name: SyncTable, id: string): Promise<Row | null> {
    if (this.offline) throw new RemoteError("network", "offline");
    return this.table(name).get(id) ?? null;
  }
}

function isAfter(row: Row, after: PullCursor): boolean {
  if (row.updated_at > after.updatedAt) return true;
  return row.updated_at === after.updatedAt && row.id > after.id;
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
