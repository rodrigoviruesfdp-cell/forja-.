import type { Exercise } from "@/domain/schemas";

/** Translated names for the catalog, keyed by source_id (see src/i18n/exercise-names). */
export type CatalogNames = Readonly<Record<string, string>>;

/** The name to show: the user's own text for custom exercises, a translation for catalog ones. */
export function exerciseDisplayName(exercise: Pick<Exercise, "name" | "source_id">, names: CatalogNames): string {
  if (exercise.source_id) return names[exercise.source_id] ?? exercise.name;
  return exercise.name;
}
