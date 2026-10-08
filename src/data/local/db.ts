import Dexie, { type EntityTable } from "dexie";
import type {
  BodyMetric,
  Exercise,
  Goal,
  Place,
  Profile,
  Routine,
  RoutineDay,
  RoutineExercise,
  Session,
  SessionExercise,
  SessionSet,
} from "@/domain/schemas";
import { SESSION_DEFAULTS } from "@/domain/schemas";
import type { SyncTable } from "@/data/sync/tables";

/** A pending local change. Append-only: each write adds an entry, push coalesces by row. */
export interface OutboxEntry {
  seq?: number;
  table: SyncTable;
  row_id: string;
  queued_at: string;
  /** Set when the server rejected the row (validation, permissions). Not retried until edited again. */
  error?: string;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

/**
 * The device's copy of the user's data (IndexedDB). The UI reads only from here,
 * which is what makes the app instant and usable without coverage.
 * One database per user, so two accounts on the same phone never mix.
 */
export class LocalDb extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  routines!: EntityTable<Routine, "id">;
  profiles!: EntityTable<Profile, "id">;
  routine_days!: EntityTable<RoutineDay, "id">;
  routine_exercises!: EntityTable<RoutineExercise, "id">;
  places!: EntityTable<Place, "id">;
  sessions!: EntityTable<Session, "id">;
  session_exercises!: EntityTable<SessionExercise, "id">;
  session_sets!: EntityTable<SessionSet, "id">;
  body_metrics!: EntityTable<BodyMetric, "id">;
  goals!: EntityTable<Goal, "id">;
  outbox!: EntityTable<OutboxEntry, "seq">;
  meta!: EntityTable<MetaEntry, "key">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      exercises: "id, created_by, primary_muscle, equipment, updated_at",
      routines: "id, updated_at",
      profiles: "id, updated_at",
      routine_days: "id, routine_id, updated_at",
      routine_exercises: "id, routine_day_id, exercise_id, updated_at",
      sessions: "id, date, routine_day_id, status, updated_at",
      session_exercises: "id, session_id, exercise_id, updated_at",
      session_sets: "id, session_exercise_id, updated_at",
      body_metrics: "id, date, updated_at",
      goals: "id, updated_at",
      outbox: "++seq, table, [table+row_id]",
      meta: "key",
    });
    // 1.5: spots, and sessions by sport/spot (for the calendar and, later, achievements).
    this.version(2)
      .stores({
        places: "id, updated_at",
        sessions: "id, date, routine_day_id, status, sport, place_id, updated_at",
      })
      .upgrade((tx) =>
        tx
          .table<Session>("sessions")
          .toCollection()
          .modify((session) => {
            session.place_id ??= SESSION_DEFAULTS.place_id;
            session.metrics ??= SESSION_DEFAULTS.metrics;
          }),
      );
  }
}

export function localDbName(userId: string): string {
  return `forja-${userId}`;
}
