"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { createContext, type ReactNode, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { demoDbName, LocalOnlyMediaRemote, LocalOnlyRemote } from "@/data/demo/demo";
import { LocalDb, localDbName } from "@/data/local/db";
import { MediaSync } from "@/data/media/media-sync";
import { SupabaseMediaRemote } from "@/data/media/remote";
import { getMeta, META_KEYS } from "@/data/local/meta";
import { SyncEngine } from "@/data/sync/engine";
import { SyncRunner, type SyncStatus } from "@/data/sync/runner";
import { SupabaseRemote } from "@/data/sync/supabase-remote";
import { getSupabase } from "@/data/supabase/client";
import type { AuthUser } from "@/features/auth/auth-store";
import { isDemoMode, useDemoMode } from "@/features/demo/demo-mode";

interface UserData {
  user: AuthUser;
  db: LocalDb;
  engine: SyncEngine;
  runner: SyncRunner;
  /** Photo files (upload, download, delete). */
  media: MediaSync;
  /** Showing the sample data (a separate local database that never syncs) instead of yours. */
  demo: boolean;
}

const UserDataContext = createContext<UserData | null>(null);

/**
 * Opens the signed-in user's local database and starts background sync (or, while trying the
 * sample data, the sample's database, whose sync goes nowhere).
 */
export function UserDataProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [value, setValue] = useState<UserData | null>(null);
  const demo = useDemoMode(user.id);

  useEffect(() => {
    let cancelled = false;
    const db = new LocalDb(demo ? demoDbName(user.id) : localDbName(user.id));
    const engine = new SyncEngine(db, demo ? new LocalOnlyRemote() : new SupabaseRemote(getSupabase()));
    const media = new MediaSync(db, demo ? new LocalOnlyMediaRemote() : new SupabaseMediaRemote(getSupabase()));
    let runner: SyncRunner | null = null;

    void (async () => {
      const [lastSyncedAt, initialSyncDone] = await Promise.all([
        getMeta<string>(db, META_KEYS.lastSyncedAt),
        getMeta<boolean>(db, META_KEYS.initialSyncDone),
      ]);
      if (cancelled) return;
      runner = new SyncRunner(
        engine,
        `forja-sync-${demo ? "demo-" : ""}${user.id}`,
        { lastSyncedAt: lastSyncedAt ?? null, initialSyncDone: initialSyncDone ?? false },
        media,
      );
      runner.start();
      setValue({ user, db, engine, runner, media, demo });
    })();

    return () => {
      cancelled = true;
      runner?.stop();
      // Leaving the sample deletes it: it only lives until you leave.
      if (demo && !isDemoMode(user.id)) void db.delete().catch(() => undefined);
      else db.close();
      setValue(null);
    };
  }, [user, demo]);

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
