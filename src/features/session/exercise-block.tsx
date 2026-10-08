"use client";

import { Check, Ellipsis, History, Plus, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { useFormatter, useTranslations } from "use-intl";
import { Card } from "@/components/ui/card";
import { targetLabel } from "@/domain/routines/builder";
import {
  copyLastTime,
  pendingSets,
  plannedSets,
  type Suggestion,
  suggestSets,
} from "@/domain/sessions/session";
import type { Exercise, SessionExercise, SessionSet } from "@/domain/schemas";
import type { LastPerformance } from "@/data/repositories/sessions";
import { ExerciseImage } from "@/features/exercises/exercise-image";
import { cn } from "@/lib/utils";
import { useSessionFormat } from "./use-session-format";

export interface PendingRow {
  number: number;
  suggestion: Suggestion;
}

interface ExerciseBlockProps {
  item: SessionExercise;
  exercise: Exercise | undefined;
  name: string;
  sets: SessionSet[];
  lastTime: LastPerformance | null;
  /** In progress: rows still to do are shown. A finished session shows only what was done. */
  live: boolean;
  onQuickLog: (row: PendingRow) => void;
  onOpenPending: (row: PendingRow) => void;
  onOpenSet: (set: SessionSet, number: number) => void;
  onAddSet: (next: PendingRow) => void;
  onMenu: () => void;
}

/**
 * One exercise of the session: what you did last time (copy it with a tap), the sets done
 * (green) and the ones still to do, pre-filled so that logging one is a single tap on its
 * circle. Tapping a row opens it to adjust weight and reps.
 */
export function ExerciseBlock({
  item,
  exercise,
  name,
  sets,
  lastTime,
  live,
  onQuickLog,
  onOpenPending,
  onOpenSet,
  onAddSet,
  onMenu,
}: ExerciseBlockProps) {
  const t = useTranslations("session");
  const common = useTranslations("common");
  const format = useFormatter();
  const fmt = useSessionFormat();
  const [copied, setCopied] = useState(false);

  const pending = live ? pendingSets(item, sets) : 0;
  const suggestions =
    copied && lastTime ? copyLastTime(sets, lastTime.sets, pending) : suggestSets(item, sets, lastTime?.sets ?? null, pending);

  let work = 0;
  const doneRows = sets.map((set) => ({ set, number: set.is_warmup ? 0 : ++work }));
  const pendingRows: PendingRow[] = suggestions.map((suggestion, i) => ({ number: work + i + 1, suggestion }));
  // "+ Serie" adds one more row, pre-filled like the others would be.
  const nextRow: PendingRow = {
    number: work + pending + 1,
    suggestion: suggestSets(item, sets, lastTime?.sets ?? null, pending + 1).at(-1) ?? { weightKg: null, reps: 8 },
  };
  const workDone = work;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <ExerciseImage src={exercise?.image_urls[0]} alt="" className="size-11 shrink-0 rounded-concentric" />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-headline">{name}</h2>
          <p className="numeric text-subhead text-muted-foreground">
            {t("target", { target: targetLabel({ target_sets: plannedSets(item), target_reps_min: item.target_reps_min ?? 8, target_reps_max: item.target_reps_max }) })}
            {live ? ` · ${t("setsProgress", { done: Math.min(workDone, plannedSets(item)), total: plannedSets(item) })}` : null}
          </p>
        </div>
        <button
          type="button"
          aria-label={`${common("more")}: ${name}`}
          onClick={onMenu}
          className="-mt-1 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground active:bg-surface-2"
        >
          <Ellipsis className="size-5" />
        </button>
      </div>

      {item.notes ? <p className="rounded-concentric bg-surface-2 px-3 py-2 text-subhead text-muted-foreground">{item.notes}</p> : null}

      {lastTime ? (
        <button
          type="button"
          disabled={pending === 0}
          onClick={() => setCopied(true)}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-concentric bg-surface-2 px-3 text-left disabled:cursor-default"
        >
          <History aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block text-footnote text-muted-foreground">
              {t("lastTime", { date: format.dateTime(new Date(`${lastTime.session.date}T12:00:00`), { day: "numeric", month: "short" }) })}
            </span>
            <span className="numeric block truncate text-subhead">{fmt.sets(lastTime.sets.filter((s) => !s.is_warmup))}</span>
          </span>
          {pending > 0 ? <span className="shrink-0 text-subhead font-semibold text-planned">{copied ? t("copied") : t("copyLastTime")}</span> : null}
        </button>
      ) : live ? (
        <p className="text-footnote text-muted-foreground">{t("firstTime")}</p>
      ) : null}

      <ul className="flex flex-col">
        <AnimatePresence initial={false}>
          {doneRows.map(({ set, number }) => {
            const value = fmt.set(set.weight_kg, set.reps);
            return (
              <motion.li key={set.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SetRowShell>
                  <button
                    type="button"
                    aria-label={t("editSetLabel", { number: number || t("warmup"), value })}
                    onClick={() => onOpenSet(set, number)}
                    className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                  >
                    <SetBadge warmup={set.is_warmup} label={set.is_warmup ? t("warmupShort") : String(number)} done />
                    <span className={cn("numeric min-w-0 flex-1 truncate text-body", set.is_warmup && "text-muted-foreground")}>{value}</span>
                    {set.is_pr ? (
                      <motion.span
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1 rounded-full bg-pr/12 px-2 py-0.5 text-caption font-semibold text-pr"
                      >
                        <Trophy className="size-3.5" strokeWidth={2.4} />
                        PR
                      </motion.span>
                    ) : null}
                  </button>
                  <span aria-hidden className="flex size-11 shrink-0 items-center justify-center">
                    <span className="flex size-8 items-center justify-center rounded-full bg-done text-white">
                      <Check className="size-[18px]" strokeWidth={3.2} />
                    </span>
                  </span>
                </SetRowShell>
              </motion.li>
            );
          })}
          {pendingRows.map((row) => {
            const value = fmt.set(row.suggestion.weightKg, row.suggestion.reps);
            return (
              <motion.li key={`pending-${row.number}`} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SetRowShell>
                  <button
                    type="button"
                    onClick={() => onOpenPending(row)}
                    className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                  >
                    <SetBadge label={String(row.number)} />
                    <span className="numeric min-w-0 flex-1 truncate text-body text-muted-foreground">
                      {row.suggestion.weightKg === null ? `— × ${row.suggestion.reps}` : value}
                    </span>
                  </button>
                  <motion.button
                    type="button"
                    aria-label={t("logSetLabel", { number: row.number, value })}
                    onClick={() => (row.suggestion.weightKg === null ? onOpenPending(row) : onQuickLog(row))}
                    whileTap={{ scale: 0.85 }}
                    className="flex size-11 shrink-0 cursor-pointer items-center justify-center"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full border-2 border-surface-3 text-tertiary-foreground">
                      <Check className="size-[18px]" strokeWidth={3} />
                    </span>
                  </motion.button>
                </SetRowShell>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <div className="-mb-1 flex">
        <button
          type="button"
          aria-label={t("addSetLabel", { exercise: name })}
          onClick={() => onAddSet(nextRow)}
          className="-ml-2 flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-subhead font-semibold text-planned active:bg-surface-2"
        >
          <Plus className="size-[18px]" strokeWidth={2.6} />
          {t("addSet")}
        </button>
      </div>
    </Card>
  );
}

function SetRowShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex items-center gap-1 after:absolute after:right-0 after:bottom-0 after:left-11 after:h-px after:origin-bottom after:scale-y-50 after:bg-separator">
      {children}
    </div>
  );
}

function SetBadge({ label, warmup = false, done = false }: { label: string; warmup?: boolean; done?: boolean }) {
  return (
    <span
      className={cn(
        "numeric flex size-8 shrink-0 items-center justify-center rounded-full text-subhead font-semibold",
        warmup
          ? "border border-dashed border-tertiary-foreground text-muted-foreground"
          : done
            ? "bg-surface-2 text-foreground"
            : "bg-surface-2 text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
