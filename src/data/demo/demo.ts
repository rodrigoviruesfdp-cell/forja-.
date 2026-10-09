/**
 * "Try with sample data": a second local database filled with a made-up history, used instead
 * of yours until you leave. Nothing in it reaches the server (its sync goes nowhere) and your
 * own data is never touched; leaving deletes it (see UserDataProvider).
 */
import Dexie from "dexie";
import { LocalDb, localDbName } from "@/data/local/db";
import { META_KEYS } from "@/data/local/meta";
import type { MediaRemote } from "@/data/media/remote";
import { checkAchievements, markAchievementsSeen } from "@/data/repositories/achievements";
import type { RemoteAdapter, Row } from "@/data/sync/remote";
import { RemoteError } from "@/data/sync/remote";
import { localDate } from "@/domain/dates";
import { templateSourceIds } from "@/domain/routines/templates";
import { buildSampleData, type SampleInput } from "@/domain/sample/sample-data";

export function demoDbName(userId: string): string {
  return `${localDbName(userId)}-demo`;
}

/** The sample's "server": accepts every upload and never has anything new. */
export class LocalOnlyRemote implements RemoteAdapter {
  async upsert(): Promise<void> {}
  async pull(): Promise<Row[]> {
    return [];
  }
  async fetchRow(): Promise<Row | null> {
    return null;
  }
}

/** Photos taken in the sample stay on the phone. */
export class LocalOnlyMediaRemote implements MediaRemote {
  async upload(): Promise<void> {}
  async remove(): Promise<void> {}
  async download(): Promise<Blob | null> {
    throw new RemoteError("rejected", "Sample data has no server copy");
  }
}

export type DemoLabels = Pick<SampleInput, "names" | "sportName" | "unit">;

/**
 * Builds the sample database from scratch: your exercise catalog and profile (so names, units
 * and language match) plus twelve weeks of made-up training. Its achievements are already
 * "seen", so opening it does not start a round of celebrations.
 */
export async function createDemo(source: LocalDb, userId: string, labels: DemoLabels): Promise<void> {
  const name = demoDbName(userId);
  await Dexie.delete(name);
  const [exercises, profile] = await Promise.all([source.exercises.toArray(), source.profiles.get(userId)]);
  const wanted = new Set(templateSourceIds());
  const exerciseIdBySource = new Map(
    exercises.filter((e) => !e.deleted_at && e.source_id && wanted.has(e.source_id)).map((e) => [e.source_id as string, e.id]),
  );
  const sample = buildSampleData({
    ...labels,
    userId,
    today: localDate(new Date()),
    exerciseIdBySource,
    newId: () => crypto.randomUUID(),
  });

  const demo = new LocalDb(name);
  try {
    const now = new Date().toISOString();
    await demo.transaction("rw", demo.tables, async () => {
      await demo.exercises.bulkPut(exercises);
      if (profile) await demo.profiles.put({ ...profile, active_routine_id: sample.routines[0]?.id ?? null });
      for (const [table, rows] of Object.entries(sample)) await demo.table(table).bulkPut(rows);
      await demo.meta.bulkPut([
        { key: META_KEYS.initialSyncDone, value: true },
        { key: META_KEYS.lastSyncedAt, value: now },
      ]);
    });
    await markAchievementsSeen(demo, await checkAchievements(demo, userId));
    // Nothing to upload: the sample never leaves the phone.
    await demo.outbox.clear();
  } finally {
    demo.close();
  }
}
