import type { Exercise } from "@/domain/schemas";
import { type CatalogNames, exerciseDisplayName } from "./names";

/** Lowercase, accent-free, punctuation-free: "Press de banca (agarre medio)" -> "press de banca agarre medio". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface SearchEntry {
  exercise: Exercise;
  displayName: string;
  /** Normalized display name, for ranking. */
  title: string;
  /** Everything a query can match: both names, muscles and equipment labels. */
  haystack: string;
}

export interface SearchLabels {
  muscle: (key: string) => string;
  equipment: (key: string) => string;
}

export function buildSearchIndex(exercises: Exercise[], names: CatalogNames, labels: SearchLabels): SearchEntry[] {
  return exercises.map((exercise) => {
    const displayName = exerciseDisplayName(exercise, names);
    const parts = [
      displayName,
      exercise.name,
      labels.muscle(exercise.primary_muscle),
      exercise.equipment ? labels.equipment(exercise.equipment) : "",
    ];
    return {
      exercise,
      displayName,
      title: normalizeText(displayName),
      haystack: normalizeText(parts.join(" ")),
    };
  });
}

export interface ExerciseFilters {
  query: string;
  muscle: string | null;
  equipment: string | null;
  onlyCustom: boolean;
}

export const EMPTY_FILTERS: ExerciseFilters = { query: "", muscle: null, equipment: null, onlyCustom: false };

function score(entry: SearchEntry, query: string, tokens: string[]): number {
  let total = 0;
  if (entry.title === query) total += 100;
  if (entry.title.startsWith(query)) total += 20;
  const words = entry.title.split(" ");
  for (const token of tokens) {
    if (words.some((word) => word.startsWith(token))) total += 5;
    else if (entry.title.includes(token)) total += 2;
  }
  // Shorter names first among equals: "Sentadilla" before "Sentadilla búlgara en multipower".
  return total - entry.title.length / 100;
}

/**
 * Instant search over the local catalog. Every word of the query must appear (in any order,
 * ignoring accents) in the name, the original English name, the muscle or the equipment.
 */
export function searchExercises(index: SearchEntry[], filters: ExerciseFilters, locale: string): SearchEntry[] {
  const query = normalizeText(filters.query);
  const tokens = query ? query.split(" ") : [];

  const matches = index.filter(({ exercise, haystack }) => {
    if (exercise.deleted_at) return false;
    if (filters.onlyCustom && !exercise.created_by) return false;
    if (filters.muscle && exercise.primary_muscle !== filters.muscle) return false;
    if (filters.equipment && exercise.equipment !== filters.equipment) return false;
    return tokens.every((token) => haystack.includes(token));
  });

  if (tokens.length === 0) {
    // Browsing: your own exercises first, then alphabetical.
    return matches.sort(
      (a, b) =>
        Number(Boolean(b.exercise.created_by)) - Number(Boolean(a.exercise.created_by)) ||
        a.displayName.localeCompare(b.displayName, locale),
    );
  }

  return matches
    .map((entry) => ({ entry, score: score(entry, query, tokens) }))
    .sort((a, b) => b.score - a.score || a.entry.displayName.localeCompare(b.entry.displayName, locale))
    .map(({ entry }) => entry);
}
