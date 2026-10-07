/**
 * Keys stored in the database for muscles, equipment and categories.
 * Labels live in the i18n messages (exercises.muscles.*, exercises.equipment.*, ...).
 */

export const MUSCLES = [
  "chest",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "lats",
  "middle_back",
  "lower_back",
  "traps",
  "abdominals",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "adductors",
  "abductors",
  "neck",
] as const;
export type Muscle = (typeof MUSCLES)[number];

/** Coarse groups for filters and (later) weekly volume per muscle group. */
export const MUSCLE_GROUPS = {
  chest: ["chest"],
  back: ["lats", "middle_back", "lower_back", "traps"],
  shoulders: ["shoulders"],
  arms: ["biceps", "triceps", "forearms"],
  legs: ["quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"],
  core: ["abdominals"],
  neck: ["neck"],
} as const satisfies Record<string, readonly Muscle[]>;
export type MuscleGroup = keyof typeof MUSCLE_GROUPS;

export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "body_only",
  "kettlebell",
  "bands",
  "ez_bar",
  "medicine_ball",
  "exercise_ball",
  "foam_roll",
  "other",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const CATEGORIES = [
  "strength",
  "powerlifting",
  "olympic_weightlifting",
  "strongman",
  "plyometrics",
  "cardio",
  "stretching",
] as const;
export type Category = (typeof CATEGORIES)[number];

export function isMuscle(value: string): value is Muscle {
  return (MUSCLES as readonly string[]).includes(value);
}

export function isEquipment(value: string): value is Equipment {
  return (EQUIPMENT as readonly string[]).includes(value);
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
