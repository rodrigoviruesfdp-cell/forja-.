"use client";

import { Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "use-intl";
import { SPRING } from "@/components/motion/spring";
import type { ExerciseRecord, SessionSummary } from "@/domain/sessions/session";
import { cn } from "@/lib/utils";
import { useSessionFormat } from "./use-session-format";

const LOOK = {
  /** Inside a sheet: filled tiles (sheet padding 16 → 12 px corners). */
  inset: { tile: "rounded-[12px] bg-surface-2 px-3.5 py-3", record: "rounded-[12px] bg-pr/10 px-3.5 py-3" },
  /** On the page: a bento grid of cards. */
  cards: {
    tile: "rounded-[22px] border bg-surface p-4 shadow-card",
    record: "rounded-[22px] border bg-surface p-4 shadow-card",
  },
} as const;

/** The numbers of a session as a small bento grid, then its records. */
export function SessionStats({
  summary,
  names,
  look = "inset",
}: {
  summary: SessionSummary;
  names: (exerciseId: string) => string;
  look?: keyof typeof LOOK;
}) {
  const t = useTranslations("session");
  const fmt = useSessionFormat();
  const tiles = [
    { key: "duration", label: t("stats.duration"), value: fmt.duration(summary.durationMin) },
    { key: "volume", label: t("stats.volume"), value: fmt.volume(summary.volumeKg) },
    { key: "sets", label: t("stats.sets"), value: String(summary.workSets) },
    { key: "exercises", label: t("stats.exercises"), value: String(summary.exercises) },
  ];
  return (
    <div className="flex flex-col gap-3">
      <dl className={cn("grid grid-cols-2", look === "cards" ? "gap-3" : "gap-2")}>
        {tiles.map((tile) => (
          <div key={tile.key} className={LOOK[look].tile}>
            <dt className="tracking-caption text-caption text-muted-foreground uppercase">{tile.label}</dt>
            <dd className="numeric text-title-2">{tile.value}</dd>
          </div>
        ))}
      </dl>
      {summary.records.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="tracking-caption px-1 text-footnote text-muted-foreground uppercase">{t("records.title")}</p>
          <ul className="flex flex-col gap-2">
            {summary.records.map((record, i) => (
              <motion.li
                key={record.sessionExerciseId}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...SPRING, delay: 0.15 + i * 0.06 }}
                className={cn("flex items-center gap-3", LOOK[look].record)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pr text-white">
                  <Trophy className="size-[18px]" strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{names(record.exerciseId)}</span>
                  <span className="numeric block text-subhead text-muted-foreground">
                    <RecordLabel record={record} />
                  </span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function RecordLabel({ record }: { record: ExerciseRecord }) {
  const t = useTranslations("session");
  const fmt = useSessionFormat();
  if (record.kinds.includes("weight")) return <>{`${t("records.weight")} · ${fmt.set(record.weightKg, record.reps)}`}</>;
  if (record.kinds.includes("e1rm") && record.e1rm !== null) {
    return <>{`${t("records.e1rm")} · ${fmt.weight(record.e1rm)} (${fmt.set(record.weightKg, record.reps)})`}</>;
  }
  return <>{`${t("records.reps")} · ${fmt.set(record.weightKg, record.reps)}`}</>;
}
