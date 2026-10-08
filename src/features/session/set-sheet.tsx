"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Group, GroupRow } from "@/components/ui/group";
import { Switch } from "@/components/ui/switch";
import { SET_LIMITS, stepWeight } from "@/domain/sessions/session";
import type { SessionSet } from "@/domain/schemas";
import { fromKg, parseDecimal, toKg, type WeightUnit } from "@/domain/units";
import { usePrefs } from "@/features/preferences/prefs";

export type SetSheetTarget =
  | { mode: "new"; number: number; weightKg: number | null; reps: number; warmup: boolean }
  | { mode: "edit"; number: number; set: SessionSet };

export interface SetValues {
  weightKg: number;
  reps: number;
  isWarmup: boolean;
}

interface SetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  target: SetSheetTarget | null;
  /** Last time's sets, as a hint. */
  lastTimeText: string | null;
  onSave: (values: SetValues) => void;
  onDelete: () => void;
}

/**
 * One set, big and thumb-sized: weight and reps with − / + (a plate step and one rep) or
 * typed, and whether it was a warm-up. Logging from here is: open, adjust, "Log set".
 */
export function SetSheet({ open, onOpenChange, exerciseName, target, lastTimeText, onSave, onDelete }: SetSheetProps) {
  const common = useTranslations("common");
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={exerciseName} closeLabel={common("close")}>
      {target ? (
        <SetForm
          key={target.mode === "edit" ? target.set.id : `new-${target.number}-${target.weightKg}-${target.reps}`}
          target={target}
          lastTimeText={lastTimeText}
          onSave={onSave}
          onDelete={onDelete}
        />
      ) : null}
    </Drawer>
  );
}

/** What the weight field shows: the number in the user's unit, with their decimal separator. */
function weightText(kg: number | null, unit: WeightUnit, locale: string): string {
  if (kg === null) return "";
  const text = String(fromKg(kg, unit));
  return locale === "es" ? text.replace(".", ",") : text;
}

function SetForm({
  target,
  lastTimeText,
  onSave,
  onDelete,
}: Pick<SetSheetProps, "lastTimeText" | "onSave" | "onDelete"> & { target: SetSheetTarget }) {
  const t = useTranslations("session");
  const { units: unit, locale } = usePrefs();
  const initial =
    target.mode === "edit"
      ? { weightKg: target.set.weight_kg, reps: target.set.reps, warmup: target.set.is_warmup }
      : { weightKg: target.weightKg, reps: target.reps, warmup: target.warmup };
  const [weightInput, setWeightInput] = useState(weightText(initial.weightKg, unit, locale));
  const [reps, setReps] = useState(initial.reps);
  const [warmup, setWarmup] = useState(initial.warmup);

  const typed = parseDecimal(weightInput);
  const weightKg = typed === null ? 0 : toKg(typed, unit);

  function step(direction: 1 | -1) {
    const next = stepWeight(weightKg, unit, direction);
    setWeightInput(weightText(next, unit, locale));
  }

  const title = warmup ? t("warmup") : t("setNumber", { number: target.number });

  return (
    <form
      className="flex flex-col gap-5 pt-1 pb-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ weightKg, reps, isWarmup: warmup });
      }}
    >
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-title-3">{title}</p>
        {lastTimeText ? <p className="text-footnote text-muted-foreground">{lastTimeText}</p> : null}
      </div>

      <BigField
        label={`${t("weight")} (${unit})`}
        decreaseLabel={t("lessWeight")}
        increaseLabel={t("moreWeight")}
        onDecrease={() => step(-1)}
        onIncrease={() => step(1)}
        canDecrease={weightKg > 0}
      >
        <input
          aria-label={`${t("weight")} (${unit})`}
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          inputMode="decimal"
          enterKeyHint="done"
          placeholder="0"
          maxLength={8}
          className="numeric w-full bg-transparent text-center text-[44px] leading-none font-semibold tracking-tight outline-none placeholder:text-tertiary-foreground"
        />
      </BigField>

      <BigField
        label={t("reps")}
        decreaseLabel={t("lessReps")}
        increaseLabel={t("moreReps")}
        onDecrease={() => setReps((r) => Math.max(0, r - 1))}
        onIncrease={() => setReps((r) => Math.min(SET_LIMITS.reps, r + 1))}
        canDecrease={reps > 0}
      >
        <input
          aria-label={t("reps")}
          value={reps}
          onChange={(e) => {
            const value = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
            setReps(Number.isFinite(value) ? Math.min(SET_LIMITS.reps, value) : 0);
          }}
          onFocus={(e) => e.currentTarget.select()}
          inputMode="numeric"
          enterKeyHint="done"
          className="numeric w-full bg-transparent text-center text-[44px] leading-none font-semibold tracking-tight outline-none"
        />
      </BigField>

      <Group footer={t("warmupFooter")}>
        <GroupRow>
          <label htmlFor="set-warmup" className="flex-1">
            {t("warmup")}
          </label>
          <Switch id="set-warmup" checked={warmup} onCheckedChange={setWarmup} />
        </GroupRow>
      </Group>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" className="w-full">
          {target.mode === "edit" ? t("done") : t("logSet")}
        </Button>
        {target.mode === "edit" ? (
          <Button type="button" variant="destructive" className="w-full" onClick={onDelete}>
            <Trash2 />
            {t("deleteSet")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** A large number between round − / + buttons (thumb targets of 56 px). */
function BigField({
  label,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease,
  canDecrease,
  children,
}: {
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  children: ReactNode;
}) {
  const round = "flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-2 disabled:opacity-30";
  return (
    <div className="flex flex-col gap-1.5">
      <p className="tracking-caption px-1 text-center text-footnote text-muted-foreground uppercase">{label}</p>
      <div className="flex items-center gap-3 rounded-[22px] border bg-surface p-3 shadow-card">
        <motion.button type="button" aria-label={decreaseLabel} disabled={!canDecrease} onClick={onDecrease} whileTap={{ scale: 0.88 }} className={round}>
          <Minus className="size-6" strokeWidth={2.4} />
        </motion.button>
        <div className="min-w-0 flex-1">{children}</div>
        <motion.button type="button" aria-label={increaseLabel} onClick={onIncrease} whileTap={{ scale: 0.88 }} className={round}>
          <Plus className="size-6" strokeWidth={2.4} />
        </motion.button>
      </div>
    </div>
  );
}
