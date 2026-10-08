import type { z } from "zod";
import {
  bodyMetricSchema,
  exerciseSchema,
  goalSchema,
  placeSchema,
  profileSchema,
  routineDaySchema,
  routineExerciseSchema,
  routineSchema,
  sessionExerciseSchema,
  sessionSchema,
  sessionSetSchema,
  userAchievementSchema,
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
  "places",
  "sessions",
  "session_exercises",
  "session_sets",
  "user_achievements",
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
  places: placeSchema,
  sessions: sessionSchema,
  session_exercises: sessionExerciseSchema,
  session_sets: sessionSetSchema,
  user_achievements: userAchievementSchema,
  body_metrics: bodyMetricSchema,
  goals: goalSchema,
} satisfies Record<SyncTable, z.ZodType>;

export type RowOf<T extends SyncTable> = z.infer<(typeof TABLE_SCHEMAS)[T]>;

/** Columns the server always overwrites; never worth uploading. */
export const SERVER_MANAGED_COLUMNS = ["updated_at"] as const;

/**
 * Values for columns added after a table first shipped. Uploads always carry them, so a row
 * saved by an older version of the app never sends a NULL where the database wants a value.
 */
export const COLUMN_DEFAULTS: { [T in SyncTable]?: Partial<RowOf<T>> } = {
  sessions: { place_id: null, metrics: {} },
};
