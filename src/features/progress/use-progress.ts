"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useFormatter, useTranslations } from "use-intl";
import { type ProgressData, progressData } from "@/data/repositories/progress";
import { dateOf } from "@/domain/dates";
import type { Bucket } from "@/domain/progress/period";
import type { ExerciseMetric } from "@/domain/progress/stats";
import { displayDecimals, fromKg } from "@/domain/units";
import { usePrefs } from "@/features/preferences/prefs";
import { useSessionFormat } from "@/features/session/use-session-format";
import { useUserData } from "@/features/user-data/user-data-context";

/** Completed sessions and their work sets, live. */
export function useProgressData(): ProgressData | undefined {
  const { db } = useUserData();
  return useLiveQuery(() => progressData(db), [db]);
}

/** How the progress screens write numbers, in the user's unit. */
export function useProgressFormat() {
  const t = useTranslations("progress");
  const format = useFormatter();
  const fmt = useSessionFormat();
  const { units } = usePrefs();

  const compact = (value: number) => format.number(value, { notation: "compact", maximumFractionDigits: 1 });

  return {
    ...fmt,
    compact,
    /** A value of an exercise metric: "82,5 kg", "1.250 kg", "12 reps" (an estimate keeps one decimal). */
    metric: (metric: ExerciseMetric, value: number) => {
      if (metric === "reps") return t("repsValue", { count: value });
      if (metric === "volume") return fmt.volume(value);
      if (metric === "e1rm") return `${format.number(fromKg(value, units), { maximumFractionDigits: 1 })} ${units}`;
      return fmt.weight(value);
    },
    /** Kilometres in the user's language ("48,5 km"). */
    km: (value: number) => `${format.number(value, { maximumFractionDigits: 1 })} km`,
    /** A metric in the user's unit, for charts (so the axis lands on round pounds too). */
    toDisplay: (metric: ExerciseMetric, value: number) => (metric === "reps" ? value : fromKg(value, units)),
    /** A charted value (already in the user's unit) with its unit. */
    displayed: (metric: ExerciseMetric, value: number) => {
      if (metric === "reps") return t("repsValue", { count: value });
      const digits = metric === "volume" ? 0 : metric === "e1rm" ? 1 : displayDecimals(units);
      return `${format.number(value, { maximumFractionDigits: digits })} ${units}`;
    },
    /** Axis numbers of a charted value, without the unit. */
    displayedAxis: (metric: ExerciseMetric, value: number) => (metric === "volume" ? compact(value) : format.number(value)),
    /** Minutes as "6 h" on axes. */
    hoursAxis: (minutes: number) =>
      minutes === 0 ? "0" : minutes >= 60 ? `${format.number(minutes / 60, { maximumFractionDigits: 1 })} h` : `${minutes} min`,
    /** Under a column: "14 sept" for a week, "oct" for a month. */
    tick: (bucket: Bucket) =>
      bucket.kind === "week"
        ? format.dateTime(dateOf(bucket.start), { day: "numeric", month: "short" })
        : format.dateTime(dateOf(bucket.start), { month: "short" }),
    /** In the tooltip: "Semana del 14 de septiembre" / "octubre de 2026". */
    bucketLabel: (bucket: Bucket) =>
      bucket.kind === "week"
        ? t("training.week", { date: format.dateTime(dateOf(bucket.start), { day: "numeric", month: "long" }) })
        : format.dateTime(dateOf(bucket.start), { month: "long", year: "numeric" }),
    shortDate: (iso: string) => format.dateTime(dateOf(iso), { day: "numeric", month: "short" }),
    date: (iso: string) => format.dateTime(dateOf(iso), { day: "numeric", month: "long", year: "numeric" }),
  };
}
