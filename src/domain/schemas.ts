/**
 * Row shapes shared by the local database, the sync engine and the UI.
 * They mirror supabase/migrations exactly (same column names and constraints).
 */
import { z } from "zod";
import { WEIGHT_UNITS } from "./units";

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const GOALS = ["strength", "hypertrophy", "health", "mixed"] as const;
export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const SCHEDULE_TYPES = ["weekly", "rotation"] as const;
export const DAY_KINDS = ["gym", "sport"] as const;
export const SESSION_STATUSES = ["planned", "in_progress", "completed", "skipped"] as const;
export const VISIBILITIES = ["private", "followers", "public"] as const;
export const MECHANICS = ["compound", "isolation"] as const;

// Lenient UUID check: accepts every id Postgres or crypto.randomUUID() produce.
const id = z.guid();
const timestamp = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const weekday = z.number().int().min(0).max(6);

const tracked = {
  created_at: timestamp,
  updated_at: timestamp,
};

const softDeletable = {
  ...tracked,
  deleted_at: timestamp.nullable(),
};

export const profileSchema = z.object({
  id,
  display_name: z.string().max(80).nullable(),
  goal: z.enum(GOALS).nullable(),
  level: z.enum(LEVELS).nullable(),
  units: z.enum(WEIGHT_UNITS),
  locale: z.enum(LOCALES),
  injury_notes: z.string().max(2000).nullable(),
  active_routine_id: id.nullable(),
  ...tracked,
});
export type Profile = z.infer<typeof profileSchema>;

export const exerciseTranslationSchema = z.object({
  name: z.string().optional(),
  instructions: z.array(z.string()).optional(),
});

export const exerciseSchema = z.object({
  id,
  created_by: id.nullable(),
  source_id: z.string().nullable(),
  name: z.string().min(1).max(120),
  translations: z.partialRecord(z.enum(LOCALES), exerciseTranslationSchema),
  primary_muscle: z.string().min(1),
  secondary_muscles: z.array(z.string()),
  equipment: z.string().nullable(),
  category: z.string().nullable(),
  mechanic: z.enum(MECHANICS).nullable(),
  instructions: z.array(z.string()),
  image_urls: z.array(z.string()),
  ...softDeletable,
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const routineSchema = z.object({
  id,
  user_id: id,
  name: z.string().min(1).max(80),
  schedule_type: z.enum(SCHEDULE_TYPES),
  training_weekdays: z.array(weekday),
  weekly_target: z.number().int().min(1).max(14).nullable(),
  notes: z.string().nullable(),
  ...softDeletable,
});
export type Routine = z.infer<typeof routineSchema>;

export const routineDaySchema = z.object({
  id,
  user_id: id,
  routine_id: id,
  name: z.string().min(1).max(60),
  kind: z.enum(DAY_KINDS),
  sport: z.string().max(60).nullable(),
  weekday: weekday.nullable(),
  position: z.number().int(),
  notes: z.string().nullable(),
  ...softDeletable,
});
export type RoutineDay = z.infer<typeof routineDaySchema>;

export const routineExerciseSchema = z.object({
  id,
  user_id: id,
  routine_day_id: id,
  exercise_id: id,
  position: z.number().int(),
  target_sets: z.number().int().min(1).max(20),
  target_reps_min: z.number().int().min(1).max(100),
  target_reps_max: z.number().int().min(1).max(100).nullable(),
  notes: z.string().nullable(),
  ...softDeletable,
});
export type RoutineExercise = z.infer<typeof routineExerciseSchema>;

export const sessionSchema = z.object({
  id,
  user_id: id,
  date: isoDate,
  kind: z.enum(DAY_KINDS),
  routine_day_id: id.nullable(),
  title: z.string().max(80).nullable(),
  sport: z.string().max(60).nullable(),
  duration_min: z.number().int().min(0).max(1440).nullable(),
  rpe: z.number().int().min(1).max(10).nullable(),
  distance_km: z.number().min(0).nullable(),
  notes: z.string().nullable(),
  status: z.enum(SESSION_STATUSES),
  visibility: z.enum(VISIBILITIES),
  started_at: timestamp.nullable(),
  ended_at: timestamp.nullable(),
  ...softDeletable,
});
export type Session = z.infer<typeof sessionSchema>;

export const sessionExerciseSchema = z.object({
  id,
  user_id: id,
  session_id: id,
  exercise_id: id,
  routine_exercise_id: id.nullable(),
  position: z.number().int(),
  target_sets: z.number().int().min(1).max(20).nullable(),
  target_reps_min: z.number().int().min(1).max(100).nullable(),
  target_reps_max: z.number().int().min(1).max(100).nullable(),
  notes: z.string().nullable(),
  ...softDeletable,
});
export type SessionExercise = z.infer<typeof sessionExerciseSchema>;

export const sessionSetSchema = z.object({
  id,
  user_id: id,
  session_exercise_id: id,
  set_number: z.number().int().min(1).max(100),
  weight_kg: z.number().min(0).max(9999),
  reps: z.number().int().min(0).max(1000),
  rpe: z.number().min(1).max(10).nullable(),
  is_warmup: z.boolean(),
  is_pr: z.boolean(),
  completed_at: timestamp.nullable(),
  ...softDeletable,
});
export type SessionSet = z.infer<typeof sessionSetSchema>;

export const bodyMetricSchema = z.object({
  id,
  user_id: id,
  date: isoDate,
  body_weight_kg: z.number().positive().max(999).nullable(),
  notes: z.string().nullable(),
  ...softDeletable,
});
export type BodyMetric = z.infer<typeof bodyMetricSchema>;

export const goalSchema = z.object({
  id,
  user_id: id,
  description: z.string().min(1).max(280),
  exercise_id: id.nullable(),
  target_value: z.number().nullable(),
  deadline: isoDate.nullable(),
  achieved_at: timestamp.nullable(),
  ...softDeletable,
});
export type Goal = z.infer<typeof goalSchema>;
