"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { use } from "react";
import type { Exercise } from "@/domain/schemas";
import type { CatalogNames } from "@/domain/exercises/names";
import { usePrefs } from "@/features/preferences/prefs";
import { useUserData } from "@/features/user-data/user-data-context";
import { loadCatalogNames } from "@/i18n/exercise-names";

/** Catalog + your own exercises, live from the phone's database (undefined while loading). */
export function useExercises(): Exercise[] | undefined {
  const { db } = useUserData();
  return useLiveQuery(() => db.exercises.filter((exercise) => !exercise.deleted_at).toArray(), [db]);
}

/** One exercise: undefined while loading, null if it does not exist or was deleted. */
export function useExercise(id: string | null): Exercise | null | undefined {
  const { db } = useUserData();
  return useLiveQuery(
    async () => {
      if (!id) return null;
      const exercise = await db.exercises.get(id);
      return exercise && !exercise.deleted_at ? exercise : null;
    },
    [db, id],
  );
}

/** Translated catalog names for the current language. Suspends the first time they load. */
export function useCatalogNames(): CatalogNames {
  const { locale } = usePrefs();
  return use(loadCatalogNames(locale));
}
