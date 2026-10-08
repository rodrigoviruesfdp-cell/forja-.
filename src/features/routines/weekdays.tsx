"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { useFormatter, useNow } from "use-intl";
import { PRESS } from "@/components/motion/spring";
import { type Weekday, WEEKDAYS, weekdayOf } from "@/domain/routines/builder";
import type { WeekStripDay } from "@/domain/routines/plan";
import { cn } from "@/lib/utils";

/** 5 January 2026 is a Monday: weekday i is that date + i days. */
const reference = (weekday: Weekday) => new Date(2026, 0, 5 + weekday);

export interface WeekdayLabels {
  narrow: string[];
  short: string[];
  long: string[];
}

/** Localized weekday names, Monday first (L M X J V S D / M T W T F S S). */
export function useWeekdayLabels(): WeekdayLabels {
  const format = useFormatter();
  return useMemo(
    () => ({
      narrow: WEEKDAYS.map((d) => format.dateTime(reference(d), { weekday: "narrow" })),
      short: WEEKDAYS.map((d) => format.dateTime(reference(d), { weekday: "short" }).replace(".", "")),
      long: WEEKDAYS.map((d) => format.dateTime(reference(d), { weekday: "long" })),
    }),
    [format],
  );
}

/** Seven round toggles, like the "Repeat" days of an iOS alarm. */
export function WeekdayPicker({
  value,
  onToggle,
  labels,
  className,
}: {
  value: readonly Weekday[];
  onToggle: (weekday: Weekday) => void;
  labels: WeekdayLabels;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-1", className)}>
      {WEEKDAYS.map((weekday) => {
        const on = value.includes(weekday);
        return (
          <motion.button
            key={weekday}
            type="button"
            aria-pressed={on}
            aria-label={labels.long[weekday]}
            onClick={() => onToggle(weekday)}
            {...PRESS}
            className={cn(
              "flex size-10 cursor-pointer items-center justify-center rounded-full text-subhead font-semibold",
              on ? "bg-foreground text-background" : "bg-surface-2 text-foreground",
            )}
          >
            {labels.narrow[weekday]}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Mini week: a letter per day and dots for gym (label color) and sport (blue). Today stands out. */
export function WeekStrip({ days, labels, className }: { days: WeekStripDay[]; labels: WeekdayLabels; className?: string }) {
  const today = weekdayOf(useNow({ updateInterval: 30 * 60 * 1000 }));
  return (
    <div className={cn("grid grid-cols-7 gap-1", className)}>
      {days.map((day) => (
        <div key={day.weekday} className="flex flex-col items-center gap-1.5">
          <span
            className={cn(
              "text-caption-2 font-semibold",
              day.weekday === today ? "text-foreground" : "text-tertiary-foreground",
            )}
          >
            {labels.narrow[day.weekday]}
          </span>
          <span className="flex h-2 items-center gap-0.5">
            {day.gym ? <span className="size-2 rounded-full bg-foreground" /> : null}
            {day.sport ? <span className="size-2 rounded-full bg-planned" /> : null}
            {!day.gym && !day.sport ? <span className="size-1.5 rounded-full bg-surface-3" /> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
