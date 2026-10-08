"use client";

import { ArrowDown, ArrowRightLeft, ArrowUp, BookOpen, ChevronLeft, CircleMinus, NotebookPen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { type Action, ActionList } from "@/components/ui/action-list";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { TextAreaRow } from "@/components/ui/form-rows";
import { Group } from "@/components/ui/group";
import { cleanText } from "@/data/repositories/profiles";
import {
  moveSessionExercise,
  removeSessionExercise,
  updateSessionExercise,
} from "@/data/repositories/sessions";
import { pendingSets, plannedSets } from "@/domain/sessions/session";
import type { SessionExercise, SessionSet } from "@/domain/schemas";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useUserData } from "@/features/user-data/user-data-context";

interface ExerciseMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SessionExercise | null;
  name: string;
  sets: SessionSet[];
  /** Position in the session, for move up / down. */
  index: number;
  count: number;
  live: boolean;
  onSwap: () => void;
}

/** ⋯ of an exercise in the session: notes, one set less, swap, reorder, details, remove (with undo). */
export function ExerciseMenu(props: ExerciseMenuProps) {
  const common = useTranslations("common");
  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange} title={props.name} closeLabel={common("close")}>
      {props.item ? <MenuBody key={props.item.id} {...props} item={props.item} close={() => props.onOpenChange(false)} /> : null}
    </Drawer>
  );
}

function MenuBody({
  item,
  name,
  sets,
  index,
  count,
  live,
  onSwap,
  close,
}: ExerciseMenuProps & { item: SessionExercise; close: () => void }) {
  const t = useTranslations("session");
  const common = useTranslations("common");
  const router = useRouter();
  const { db } = useUserData();
  const [view, setView] = useState<"main" | "notes">("main");
  const [notes, setNotes] = useState(item.notes ?? "");

  async function remove() {
    close();
    const undo = await removeSessionExercise(db, item);
    toast(t("exerciseRemoved", { name }), { action: { label: common("undo"), onClick: () => void undo() } });
  }

  if (view === "notes") {
    return (
      <form
        className="flex flex-col gap-4 pt-1"
        onSubmit={(event) => {
          event.preventDefault();
          void updateSessionExercise(db, item, { notes: cleanText(notes, 500) }).then(close);
        }}
      >
        <button
          type="button"
          onClick={() => setView("main")}
          className="-ml-1 flex h-11 w-fit cursor-pointer items-center gap-1 text-planned"
        >
          <ChevronLeft className="size-5" />
          {common("back")}
        </button>
        <Group title={t("exerciseNotes")}>
          <TextAreaRow
            aria-label={t("exerciseNotes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            maxLength={500}
            rows={3}
            autoFocus
          />
        </Group>
        <Button type="submit" size="lg" className="w-full">
          {common("save")}
        </Button>
      </form>
    );
  }

  const canSwap = sets.length === 0;
  const actions: Action[] = [
    { key: "notes", label: t("exerciseNotes"), Icon: NotebookPen, onSelect: () => setView("notes") },
    ...(live && pendingSets(item, sets) > 0
      ? [
          {
            key: "less",
            label: t("removePending"),
            Icon: CircleMinus,
            onSelect: () => void updateSessionExercise(db, item, { plannedSets: plannedSets(item) - 1 }),
          },
        ]
      : []),
    {
      key: "swap",
      label: t("swap"),
      Icon: ArrowRightLeft,
      disabled: !canSwap,
      onSelect: () => {
        close();
        onSwap();
      },
    },
    { key: "up", label: t("moveUp"), Icon: ArrowUp, disabled: index <= 0, onSelect: () => void moveSessionExercise(db, item, -1) },
    {
      key: "down",
      label: t("moveDown"),
      Icon: ArrowDown,
      disabled: index >= count - 1,
      onSelect: () => void moveSessionExercise(db, item, 1),
    },
    {
      key: "detail",
      label: t("openDetail"),
      Icon: BookOpen,
      onSelect: () => {
        close();
        setNavDirection("forward");
        router.push(`/exercises/detail?id=${item.exercise_id}`);
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3 pt-1">
      <ActionList actions={actions} />
      {canSwap ? null : <p className="px-4 text-footnote text-muted-foreground">{t("swapLocked")}</p>}
      <ActionList actions={[{ key: "remove", label: t("removeExercise"), Icon: Trash2, destructive: true, onSelect: () => void remove() }]} />
    </div>
  );
}
