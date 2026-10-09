"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { createContext, type ReactNode, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { LocalDb, localDbName } from "@/data/local/db";
import { MediaSync } from "@/data/media/media-sync";
import { SupabaseMediaRemote } from "@/data/media/remote";
import { getMeta, META_KEYS } from "@/data/local/meta";
import { SyncEngine } from "@/data/sync/engine";
import { SyncRunner, type SyncStatus } from "@/data/sync/runner";
import { SupabaseRemote } from "@/data/sync/supabase-remote";
import { getSupabase } from "@/data/supabase/client";
import type { AuthUser } from "@/features/auth/auth-store";

interface UserData {
  user: AuthUser;
  db: LocalDb;
  engine: SyncEngine;
  runner: SyncRunner;
  /** Photo files (upload, download, delete). */
  media: MediaSync;
}

const UserDataContext = createContext<UserData | null>(null);

/** Opens the signed-in user's local database and starts background sync. */
export function UserDataProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [value, setValue] = useState<UserData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const db = new LocalDb(localDbName(user.id));
    const engine = new SyncEngine(db, new SupabaseRemote(getSupabase()));
    const media = new MediaSync(db, new SupabaseMediaRemote(getSupabase()));
    let runner: SyncRunner | null = null;

    void (async () => {
      const [lastSyncedAt, initialSyncDone] = await Promise.all([
        getMeta<string>(db, META_KEYS.lastSyncedAt),
        getMeta<boolean>(db, META_KEYS.initialSyncDone),
      ]);
      if (cancelled) return;
      runner = new SyncRunner(
        engine,
        `forja-sync-${user.id}`,
        { lastSyncedAt: lastSyncedAt ?? null, initialSyncDone: initialSyncDone ?? false },
        media,
      );
      runner.start();
      setValue({ user, db, engine, runner, media });
    })();

    return () => {
      cancelled = true;
      runner?.stop();
      db.close();
      setValue(null);
    };
  }, [user]);

  if (!value) return null;
  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserData {
  const value = useContext(UserDataContext);
  if (!value) throw new Error("useUserData must be used inside <UserDataProvider>");
  return value;
}

export function useSyncStatus(): SyncStatus {
  const { runner } = useUserData();
  return useSyncExternalStore(runner.subscribe, runner.getStatus, runner.getStatus);
}

/** Changes saved on this phone and not uploaded yet (rejected ones excluded). */
export function usePendingChanges(): number {
  const { db } = useUserData();
  return useLiveQuery(() => db.outbox.filter((entry) => !entry.error).count(), [db], 0);
}
