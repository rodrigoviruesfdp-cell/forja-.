"use client";

import { ArrowDown, ArrowRightLeft, ArrowUp, BookOpen, ChevronLeft, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { type Action, ActionList } from "@/components/ui/action-list";
import { Drawer } from "@/components/ui/drawer";
import { TextAreaRow } from "@/components/ui/form-rows";
import { Group, GroupRow } from "@/components/ui/group";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import {
  moveExercise,
  removeRoutineExercise,
  reorderExercises,
  restore,
  updateRoutineExercise,
} from "@/data/repositories/routines";
import { cleanText } from "@/data/repositories/profiles";
import { LIMITS, moveItem } from "@/domain/routines/builder";
import type { RoutineDay, RoutineExercise } from "@/domain/schemas";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useUserData } from "@/features/user-data/user-data-context";

interface ExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RoutineExercise | null;
  name: string;
  /** Exercises of the same day, in order (for move up/down). */
  siblings: RoutineExercise[];
  /** Other gym days it can move to, with their display titles. */
  otherDays: { day: RoutineDay; title: string }[];
}

/**
 * Targets for one exercise of the routine: sets and reps (fixed or a range for double
 * progression) with iOS steppers, notes, and actions. Changes save as you make them.
 */
export function ExerciseSheet({ open, onOpenChange, item, name, siblings, otherDays }: ExerciseSheetProps) {
  const common = useTranslations("common");
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={name} closeLabel={common("close")}>
      {item ? (
        <ExerciseSheetBody
          key={item.id}
          item={item}
          name={name}
          siblings={siblings}
          otherDays={otherDays}
          close={() => onOpenChange(false)}
        />
      ) : null}
    </Drawer>
  );
}

function ExerciseSheetBody({
  item,
  name,
  siblings,
  otherDays,
  close,
}: Omit<ExerciseSheetProps, "open" | "onOpenChange" | "item"> & { item: RoutineExercise; close: () => void }) {
  const tx = useTranslations("routines.exercise");
  const common = useTranslations("common");
  const router = useRouter();
  const { db } = useUserData();
  // Local copy: quick taps on the steppers build on each other instead of on a stale row.
  const [draft, setDraft] = useState(item);
  const [view, setView] = useState<"main" | "move">("main");
  const range = draft.target_reps_max !== null;

  async function change(patch: Partial<Pick<RoutineExercise, "target_sets" | "target_reps_min" | "target_reps_max">>) {
    setDraft(await updateRoutineExercise(db, draft, patch));
  }

  const index = siblings.findIndex((s) => s.id === item.id);
  async function shift(by: -1 | 1) {
    const ids = moveItem(
      siblings.map((s) => s.id),
      index,
      index + by,
    );
    await reorderExercises(db, item.routine_day_id, ids);
  }

  async function remove() {
    const undo = await removeRoutineExercise(db, draft);
    close();
    toast(tx("removed", { name }), { action: { label: common("undo"), onClick: () => void restore(db, undo) } });
  }

  if (view === "move") {
    return (
      <div className="flex flex-col gap-3 pt-1">
        <button
          type="button"
          onClick={() => setView("main")}
          className="flex cursor-pointer items-center gap-1 self-start text-planned"
        >
          <ChevronLeft className="size-5" strokeWidth={2.4} />
          {tx("moveTo")}
        </button>
        <ActionList
          actions={otherDays.map(({ day, title }) => ({
            key: day.id,
            label: title,
            Icon: ArrowRightLeft,
            onSelect: () => {
              void moveExercise(db, draft, day).then(() => toast(tx("moved", { day: title })));
              close();
            },
          }))}
        />
      </div>
    );
  }

  const actions: Action[] = [
    { key: "up", label: tx("moveUp"), Icon: ArrowUp, disabled: index <= 0, onSelect: () => void shift(-1) },
    {
      key: "down",
      label: tx("moveDown"),
      Icon: ArrowDown,
      disabled: index < 0 || index >= siblings.length - 1,
      onSelect: () => void shift(1),
    },
    ...(otherDays.length > 0
      ? [{ key: "move", label: tx("moveTo"), Icon: ArrowRightLeft, onSelect: () => setView("move") }]
      : []),
    {
      key: "detail",
      label: tx("openDetail"),
      Icon: BookOpen,
      onSelect: () => {
        close();
        setNavDirection("forward");
        router.push(`/exercises/detail?id=${item.exercise_id}`);
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 pt-1">
      <Group>
        <GroupRow className="justify-between">
          <span>{tx("sets")}</span>
          <Stepper
            value={draft.target_sets}
            min={LIMITS.sets.min}
            max={LIMITS.sets.max}
            onChange={(value) => void change({ target_sets: value })}
            decreaseLabel={tx("decrease", { label: tx("sets") })}
            increaseLabel={tx("increase", { label: tx("sets") })}
          />
        </GroupRow>
      </Group>

      <Group title={tx("reps")}>
        <GroupRow className="justify-between">
          <label htmlFor="reps-range">{tx("range")}</label>
          <Switch
            id="reps-range"
            checked={range}
            onCheckedChange={(on) =>
              void change({ target_reps_max: on ? Math.min(draft.target_reps_min + 4, LIMITS.reps.max) : null })
            }
          />
        </GroupRow>
        <GroupRow className="justify-between">
          <span>{range ? tx("repsMin") : tx("reps")}</span>
          <Stepper
            value={draft.target_reps_min}
            min={LIMITS.reps.min}
            max={LIMITS.reps.max}
            onChange={(value) => void change({ target_reps_min: value })}
            decreaseLabel={tx("decrease", { label: tx("reps") })}
            increaseLabel={tx("increase", { label: tx("reps") })}
          />
        </GroupRow>
        {range ? (
          <GroupRow className="justify-between">
            <span>{tx("repsMax")}</span>
            <Stepper
              value={draft.target_reps_max ?? draft.target_reps_min}
              min={draft.target_reps_min + 1}
              max={LIMITS.reps.max}
              onChange={(value) => void change({ target_reps_max: value })}
              decreaseLabel={tx("decrease", { label: tx("repsMax") })}
              increaseLabel={tx("increase", { label: tx("repsMax") })}
            />
          </GroupRow>
        ) : null}
      </Group>

      <Group title={tx("notes")}>
        <TextAreaRow
          aria-label={tx("notes")}
          defaultValue={draft.notes ?? ""}
          placeholder={tx("notesPlaceholder")}
          rows={2}
          className="min-h-16"
          onBlur={(e) => {
            const notes = cleanText(e.target.value, 2000);
            if (notes !== draft.notes) void updateRoutineExercise(db, draft, { notes }).then(setDraft);
          }}
        />
      </Group>

      <ActionList actions={actions} />
      <ActionList
        actions={[{ key: "remove", label: tx("remove"), Icon: Trash2, destructive: true, onSelect: () => void remove() }]}
      />
    </div>
  );
}
