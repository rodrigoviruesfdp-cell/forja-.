import type { z } from "zod";
import {
  bodyMetricSchema,
  exerciseSchema,
  goalSchema,
  profileSchema,
  routineDaySchema,
  routineExerciseSchema,
  routineSchema,
  sessionExerciseSchema,
  sessionSchema,
  sessionSetSchema,
} from "@/domain/schemas";

/**
 * Tables replicated between the device and Supabase, in foreign-key order:
 * a parent is always pushed before its children (profiles go after routines
 * because profiles.active_routine_id points to a routine).
 */
export const SYNC_TABLES = [
  "exercises",
  "routines",
  "profiles",
  "routine_days",
  "routine_exercises",
  "sessions",
  "session_exercises",
  "session_sets",
  "body_metrics",
  "goals",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

export const TABLE_SCHEMAS = {
  exercises: exerciseSchema,
  routines: routineSchema,
  profiles: profileSchema,
  routine_days: routineDaySchema,
  routine_exercises: routineExerciseSchema,
  sessions: sessionSchema,
  session_exercises: sessionExerciseSchema,
  session_sets: sessionSetSchema,
  body_metrics: bodyMetricSchema,
  goals: goalSchema,
} satisfies Record<SyncTable, z.ZodType>;

export type RowOf<T extends SyncTable> = z.infer<(typeof TABLE_SCHEMAS)[T]>;

/** Columns the server always overwrites; never worth uploading. */
export const SERVER_MANAGED_COLUMNS = ["updated_at"] as const;
