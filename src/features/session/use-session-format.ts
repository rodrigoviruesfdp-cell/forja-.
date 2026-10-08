"use client";

import { useFormatter, useTranslations } from "use-intl";
import { displayDecimals, fromKg } from "@/domain/units";
import { usePrefs } from "@/features/preferences/prefs";

/** How weights, sets and durations read in the session screens (in the user's unit). */
export function useSessionFormat() {
  const t = useTranslations("session");
  const format = useFormatter();
  const { units } = usePrefs();

  const number = (kg: number) => format.number(fromKg(kg, units), { maximumFractionDigits: displayDecimals(units) });

  return {
    units,
    /** "62,5" in the user's unit, without the unit. */
    weightNumber: number,
    weight: (kg: number) => `${number(kg)} ${units}`,
    /** "62,5 kg × 8", or "8 reps" without added weight. */
    set: (weightKg: number | null, reps: number) =>
      weightKg === null || weightKg === 0 ? t("repsOnly", { count: reps }) : `${number(weightKg)} ${units} × ${reps}`,
    /** "60 × 10 · 62,5 × 8" (compact, for "last time"). */
    sets: (sets: readonly { weight_kg: number; reps: number }[]) =>
      sets.map((s) => (s.weight_kg === 0 ? `${s.reps}` : `${number(s.weight_kg)} × ${s.reps}`)).join(" · "),
    duration: (minutes: number | null) => {
      if (minutes === null) return "—";
      if (minutes < 60) return t("stats.minutes", { count: minutes });
      return t("stats.hours", { hours: Math.floor(minutes / 60), minutes: String(minutes % 60).padStart(2, "0") });
    },
    /** Total kilos moved ("—" for a session without added weight). */
    volume: (kg: number) => (kg > 0 ? `${format.number(Math.round(fromKg(kg, units)))} ${units}` : "—"),
  };
}
