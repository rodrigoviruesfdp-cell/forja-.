"use client";

import { useTranslations } from "use-intl";
import type { RoutineDay, Routine } from "@/domain/schemas";
import type { RoutineTemplate } from "@/domain/routines/templates";
import type { SportKey } from "@/domain/sports";

/** Texts that depend on routine data (summaries, template names). */
export function useRoutineLabels() {
  const t = useTranslations("routines");
  const tSports = useTranslations("sports");
  return {
    summary(routine: Routine, days: readonly RoutineDay[]): string {
      return routine.schedule_type === "weekly"
        ? t("summary.weekly", { count: days.filter((day) => day.weekday !== null).length })
        : t("summary.rotation", { count: days.filter((day) => day.kind === "gym").length });
    },
    templateNames(template: RoutineTemplate) {
      return {
        routine: t(`templates.${template.key}.name`),
        day: (key: string, kind: RoutineDay["kind"]) =>
          kind === "sport" ? tSports(key as SportKey) : t(`templates.days.${key as "legs"}`),
      };
    },
  };
}
