import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { type PullCursor, RemoteError, type RemoteAdapter, type Row } from "./remote";
import type { SyncTable } from "./tables";

/** RemoteAdapter backed by Supabase (PostgREST). RLS limits every query to the signed-in user. */
export class SupabaseRemote implements RemoteAdapter {
  constructor(private readonly supabase: SupabaseClient) {}

  async upsert(table: SyncTable, rows: Row[]): Promise<void> {
    const { error, status } = await this.supabase.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw toRemoteError(error, status);
  }

  async pull(table: SyncTable, after: PullCursor | null, limit: number): Promise<Row[]> {
    let query = this.supabase
      .from(table)
      .select("*")
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);

    if (after) {
      query =
        after.id === ""
          ? query.gte("updated_at", after.updatedAt)
          : query.or(
              `updated_at.gt."${after.updatedAt}",and(updated_at.eq."${after.updatedAt}",id.gt.${after.id})`,
            );
    }

    const { data, error, status } = await query;
    if (error) throw toRemoteError(error, status);
    return (data ?? []) as Row[];
  }

  async fetchRow(table: SyncTable, id: string): Promise<Row | null> {
    const { data, error, status } = await this.supabase.from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw toRemoteError(error, status);
    return (data as Row | null) ?? null;
  }
}

function toRemoteError(error: PostgrestError, status: number): RemoteError {
  // status 0: the request never reached the server (no coverage, DNS, CORS...).
  if (status === 0 || status >= 500 || status === 408 || status === 429) {
    return new RemoteError("network", error.message);
  }
  // JWT expired/invalid. 42501 (RLS) is a 403 too, but that one is about the data.
  if (status === 401 || (status === 403 && error.code?.startsWith("PGRST3"))) {
    return new RemoteError("auth", error.message);
  }
  return new RemoteError("rejected", [error.message, error.details].filter(Boolean).join(" — "));
}
