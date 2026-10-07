import type { LocalDb } from "@/data/local/db";
import { saveRows } from "@/data/local/mutations";
import { type CustomExerciseInput, customExerciseRow } from "@/domain/exercises/custom-exercise";
import type { Exercise } from "@/domain/schemas";

/** Creates a new exercise of the user's own, or saves changes to an existing one. Returns its id. */
export async function saveCustomExercise(
  db: LocalDb,
  userId: string,
  input: CustomExerciseInput,
  existing?: Exercise,
): Promise<string> {
  const row = customExerciseRow(input, {
    userId,
    now: new Date().toISOString(),
    id: existing?.id ?? crypto.randomUUID(),
    existing,
  });
  await saveRows(db, "exercises", [row]);
  return row.id;
}

/** Soft delete: it disappears everywhere, but past sessions that used it keep their history. */
export async function deleteCustomExercise(db: LocalDb, userId: string, exercise: Exercise): Promise<void> {
  if (exercise.created_by !== userId) throw new Error("Only your own exercises can be deleted");
  await saveRows(db, "exercises", [{ ...exercise, deleted_at: new Date().toISOString() }]);
}
