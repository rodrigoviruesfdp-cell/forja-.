import { z } from "zod";
import type { Exercise } from "@/domain/schemas";
import { CATEGORIES, EQUIPMENT, MUSCLES } from "./taxonomy";

/** What the user fills in to create or edit an exercise of their own. */
export const customExerciseInputSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(120),
  primaryMuscle: z.enum(MUSCLES, { message: "primaryRequired" }),
  secondaryMuscles: z.array(z.enum(MUSCLES)),
  equipment: z.enum(EQUIPMENT).nullable(),
  category: z.enum(CATEGORIES).nullable(),
  instructions: z.string().max(4000),
});
export type CustomExerciseInput = z.infer<typeof customExerciseInputSchema>;

/** One step per non-empty line. */
export function instructionsFromText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function instructionsToText(steps: string[]): string {
  return steps.join("\n");
}

/** Builds the database row for a new custom exercise, or applies an edit to an existing one. */
export function customExerciseRow(
  input: CustomExerciseInput,
  context: { userId: string; now: string; id: string; existing?: Exercise },
): Exercise {
  const parsed = customExerciseInputSchema.parse(input);
  const base: Exercise = context.existing ?? {
    id: context.id,
    created_by: context.userId,
    source_id: null,
    name: "",
    translations: {},
    primary_muscle: parsed.primaryMuscle,
    secondary_muscles: [],
    equipment: null,
    category: null,
    mechanic: null,
    instructions: [],
    image_urls: [],
    created_at: context.now,
    updated_at: context.now,
    deleted_at: null,
  };
  if (base.created_by !== context.userId) throw new Error("Only your own exercises can be edited");

  return {
    ...base,
    name: parsed.name,
    primary_muscle: parsed.primaryMuscle,
    secondary_muscles: [...new Set(parsed.secondaryMuscles)].filter((m) => m !== parsed.primaryMuscle),
    equipment: parsed.equipment,
    category: parsed.category,
    instructions: instructionsFromText(parsed.instructions),
    updated_at: context.now,
  };
}

export function inputFromExercise(exercise: Exercise): CustomExerciseInput {
  return {
    name: exercise.name,
    primaryMuscle: exercise.primary_muscle as CustomExerciseInput["primaryMuscle"],
    secondaryMuscles: exercise.secondary_muscles as CustomExerciseInput["secondaryMuscles"],
    equipment: (exercise.equipment as CustomExerciseInput["equipment"]) ?? null,
    category: (exercise.category as CustomExerciseInput["category"]) ?? null,
    instructions: instructionsToText(exercise.instructions),
  };
}
