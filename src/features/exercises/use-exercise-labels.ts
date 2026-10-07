"use client";

import { useMemo } from "react";
import { useTranslations } from "use-intl";

/** Translates database keys (muscles, equipment...) and falls back to the raw key if unknown. */
export function useExerciseLabels() {
  const t = useTranslations("exercises");
  return useMemo(() => {
    const label = (group: "muscles" | "equipment" | "categories" | "mechanics", key: string) => {
      const path = `${group}.${key}` as Parameters<typeof t>[0];
      return t.has(path) ? t(path) : key.replace(/_/g, " ");
    };
    return {
      muscle: (key: string) => label("muscles", key),
      equipment: (key: string) => label("equipment", key),
      category: (key: string) => label("categories", key),
      mechanic: (key: string) => label("mechanics", key),
    };
  }, [t]);
}
