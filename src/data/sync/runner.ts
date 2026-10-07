import { onLocalWrite } from "@/data/local/mutations";
import type { SyncEngine } from "./engine";
import { RemoteError } from "./remote";

export type SyncPhase = "idle" | "syncing" | "offline" | "error";

export interface SyncStatus {
  phase: SyncPhase;
  error: string | null;
  lastSyncedAt: string | null;
  initialSyncDone: boolean;
}

const LOCAL_WRITE_DEBOUNCE_MS = 1500;
const PERIODIC_MS = 60_000;

/**
 * Decides when to sync: on start, after local writes (debounced), when the
 * connection comes back, when the app returns to the foreground and every
 * minute while visible. Exposes a status the UI can subscribe to.
 */
export class SyncRunner {
  private status: SyncStatus;
  private readonly listeners = new Set<() => void>();
  private readonly cleanups: (() => void)[] = [];
  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly engine: SyncEngine,
    private readonly lockName: string,
    initial: Pick<SyncStatus, "lastSyncedAt" | "initialSyncDone">,
  ) {
    this.status = { phase: "idle", error: null, ...initial };
  }

  start(): void {
    const onOnline = () => void this.syncNow();
    const onVisible = () => {
      if (document.visibilityState === "visible") void this.syncNow();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void this.syncNow();
    }, PERIODIC_MS);
    const offWrite = onLocalWrite(() => this.scheduleSync());

    this.cleanups.push(
      () => window.removeEventListener("online", onOnline),
      () => document.removeEventListener("visibilitychange", onVisible),
      () => clearInterval(interval),
      offWrite,
    );
    void this.syncNow();
  }

  stop(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    if (this.debounce) clearTimeout(this.debounce);
  }

  scheduleSync(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => void this.syncNow(), LOCAL_WRITE_DEBOUNCE_MS);
  }

  async syncNow(): Promise<void> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.set({ phase: "offline", error: null });
      return;
    }
    this.set({ phase: "syncing", error: null });
    try {
      await this.withLock(() => this.engine.sync());
      this.set({ phase: "idle", error: null, lastSyncedAt: new Date().toISOString(), initialSyncDone: true });
    } catch (error) {
      if (error instanceof RemoteError && error.kind === "network") {
        this.set({ phase: "offline", error: null });
      } else {
        this.set({ phase: "error", error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /** Only one tab syncs at a time; the others skip instead of queuing. */
  private async withLock(fn: () => Promise<unknown>): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.locks) {
      await fn();
      return;
    }
    await navigator.locks.request(this.lockName, { ifAvailable: true }, async (lock) => {
      if (lock) await fn();
    });
  }

  getStatus = (): SyncStatus => this.status;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.listeners) listener();
  }
}
