"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CircleCheck, Ellipsis, Plus, Share, Trash2, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "use-intl";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { ActionList } from "@/components/ui/action-list";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { Drawer } from "@/components/ui/drawer";
import { IconButton, IconLink } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { useSticky } from "@/components/ui/use-sticky";
import {
  addSessionExercises,
  deleteSet,
  discardSession,
  logSet,
  sessionSummary,
  swapSessionExercise,
  updateSessionExercise,
  updateSet,
} from "@/data/repositories/sessions";
import { exerciseDisplayName } from "@/domain/exercises/names";
import type { RecordKind } from "@/domain/sessions/records";
import { lastSetAt, pendingSets, plannedSets } from "@/domain/sessions/session";
import type { Session, SessionExercise } from "@/domain/schemas";
import { ExercisePicker } from "@/features/exercises/exercise-picker";
import { useCatalogNames } from "@/features/exercises/use-exercises";
import { setNavDirection } from "@/features/shell/nav-direction";
import { PageHeader } from "@/features/shell/page-header";
import { useUserData } from "@/features/user-data/user-data-context";
import { ExerciseBlock, type PendingRow } from "./exercise-block";
import { ExerciseMenu } from "./exercise-menu";
import { FinishSheet } from "./finish-sheet";
import { SessionBar } from "./session-bar";
import { SessionStats } from "./session-stats";
import { type SetSheetTarget, SetSheet, type SetValues } from "./set-sheet";
import { type SessionTree, useSessionTree } from "./use-session";
import { useSessionFormat } from "./use-session-format";

/** /session?id=… */
export function SessionScreen() {
  const t = useTranslations("session");
  const id = useSearchParams().get("id");
  const tree = useSessionTree(id);

  if (tree === undefined) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  }
  if (tree === null) {
    return (
      <>
        <PageHeader title={t("title")} backFallback="/today" hideProfile />
        <p className="px-4 pt-2 text-muted-foreground">{t("notFound")}</p>
      </>
    );
  }
  return <SessionView tree={tree} />;
}

type Sheet =
  | { type: "set"; itemId: string; target: SetSheetTarget }
  | { type: "menu"; itemId: string }
  | { type: "add" }
  | { type: "swap"; itemId: string }
  | { type: "finish" }
  | { type: "options" };

function SessionView({ tree }: { tree: SessionTree }) {
  const t = useTranslations("session");
  const tShare = useTranslations("share");
  const tRoutines = useTranslations("routines");
  const common = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const confirm = useConfirm();
  const names = useCatalogNames();
  const fmt = useSessionFormat();
  const { db } = useUserData();
  const { session, items, sets, catalog, lastTime } = tree;
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const shown = useSticky(sheet);
  const live = session.status === "in_progress";

  const nameOf = (exerciseId: string) => {
    const exercise = catalog.get(exerciseId);
    return exercise ? exerciseDisplayName(exercise, names) : tRoutines("exercise.missing");
  };
  const itemById = (id: string | undefined) => items.find((item) => item.id === id) ?? null;
  const setsOf = (item: SessionExercise) => sets.get(item.id) ?? [];
  const allSets = [...sets.values()].flat();
  const pendingTotal = live ? items.reduce((sum, item) => sum + pendingSets(item, setsOf(item)), 0) : 0;

  const closeSheet = () => setSheet(null);

  function celebrate(item: SessionExercise, records: RecordKind[]) {
    if (records.length === 0) return;
    toast.success(t("records.toast", { exercise: nameOf(item.exercise_id) }), { icon: <Trophy className="size-5 text-pr" /> });
  }

  async function quickLog(item: SessionExercise, row: PendingRow) {
    const { records } = await logSet(db, item, { weightKg: row.suggestion.weightKg ?? 0, reps: row.suggestion.reps, isWarmup: false });
    celebrate(item, records);
  }

  const openSet = shown?.type === "set" ? shown : null;
  const setItem = itemById(openSet?.itemId);

  async function saveSet(values: SetValues) {
    if (!openSet || !setItem) return;
    closeSheet();
    if (openSet.target.mode === "edit") {
      celebrate(setItem, await updateSet(db, setItem, openSet.target.set, values));
      return;
    }
    // A set logged from a pending row fills that row; one beyond the plan raises the plan.
    if (live && !values.isWarmup && pendingSets(setItem, setsOf(setItem)) === 0) {
      await updateSessionExercise(db, setItem, { plannedSets: plannedSets(setItem) + 1 });
    }
    const { records } = await logSet(db, setItem, values);
    celebrate(setItem, records);
  }

  async function removeSet() {
    if (!openSet || !setItem || openSet.target.mode !== "edit") return;
    closeSheet();
    const undo = await deleteSet(db, setItem, openSet.target.set);
    toast(t("setDeleted"), { action: { label: common("undo"), onClick: () => void undo() } });
  }

  async function discard() {
    closeSheet();
    const ok = await confirm({
      title: live ? t("discardTitle") : t("deleteTitle"),
      message: t("discardMessage"),
      confirmLabel: live ? t("discard") : t("deleteSession"),
      cancelLabel: common("cancel"),
      destructive: true,
    });
    if (!ok) return;
    const undo = await discardSession(db, session);
    toast(live ? t("discarded") : t("deleted"), { action: { label: common("undo"), onClick: () => void undo() } });
    setNavDirection("back");
    router.replace("/today");
  }

  const menuItem = shown?.type === "menu" ? itemById(shown.itemId) : null;
  const swapItem = shown?.type === "swap" ? itemById(shown.itemId) : null;
  const date = format.dateTime(new Date(`${session.date}T12:00:00`), { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader
        title={session.title ?? t("title")}
        subtitle={live ? `${t("inProgress")} · ${date}` : date}
        backFallback="/today"
        hideProfile
        actions={
          <>
            {live ? null : (
              <IconLink href={`/share?session=${session.id}`} data-nav="forward" aria-label={tShare("shareSession")}>
                <Share />
              </IconLink>
            )}
            <IconButton aria-label={t("sessionMenu")} onClick={() => setSheet({ type: "options" })}>
              <Ellipsis />
            </IconButton>
          </>
        }
      />

      <Stagger className="flex flex-col gap-3 px-4 pb-6">
        {live ? null : (
          <StaggerItem>
            <CompletedCard session={session} names={nameOf} />
          </StaggerItem>
        )}

        {items.length === 0 ? (
          <StaggerItem>
            <Card className="flex flex-col gap-1 text-center">
              <p className="text-headline">{t("emptyTitle")}</p>
              <p className="text-subhead text-muted-foreground">{t("emptyBody")}</p>
            </Card>
          </StaggerItem>
        ) : (
          items.map((item) => (
            <StaggerItem key={item.id}>
              <ExerciseBlock
                item={item}
                exercise={catalog.get(item.exercise_id)}
                name={nameOf(item.exercise_id)}
                sets={setsOf(item)}
                lastTime={lastTime.get(item.exercise_id) ?? null}
                live={live}
                onQuickLog={(row) => void quickLog(item, row)}
                onOpenPending={(row) =>
                  setSheet({
                    type: "set",
                    itemId: item.id,
                    target: { mode: "new", number: row.number, weightKg: row.suggestion.weightKg, reps: row.suggestion.reps, warmup: false },
                  })
                }
                onOpenSet={(set, number) => setSheet({ type: "set", itemId: item.id, target: { mode: "edit", number, set } })}
                onAddSet={(row) => {
                  if (live) void updateSessionExercise(db, item, { plannedSets: plannedSets(item) + 1 });
                  else
                    setSheet({
                      type: "set",
                      itemId: item.id,
                      target: { mode: "new", number: row.number, weightKg: row.suggestion.weightKg, reps: row.suggestion.reps, warmup: false },
                    });
                }}
                onMenu={() => setSheet({ type: "menu", itemId: item.id })}
              />
            </StaggerItem>
          ))
        )}

        <StaggerItem>
          <Button variant="secondary" className="w-full" onClick={() => setSheet({ type: "add" })}>
            <Plus />
            {t("addExercise")}
          </Button>
        </StaggerItem>

        {live ? null : (
          <StaggerItem className="flex flex-col gap-2">
            <ButtonLink href={`/share?session=${session.id}`} data-nav="forward" variant="secondary" className="w-full">
              <Share />
              {tShare("shareSession")}
            </ButtonLink>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setNavDirection("back");
                router.push("/today");
              }}
            >
              {t("done")}
            </Button>
          </StaggerItem>
        )}
      </Stagger>

      {live ? <SessionBar session={session} lastSetAt={lastSetAt(allSets)} onFinish={() => setSheet({ type: "finish" })} /> : null}

      <SetSheet
        open={sheet?.type === "set"}
        onOpenChange={closeSheet}
        exerciseName={setItem ? nameOf(setItem.exercise_id) : ""}
        target={openSet?.target ?? null}
        lastTimeText={(() => {
          const last = setItem ? lastTime.get(setItem.exercise_id) : null;
          if (!last) return null;
          const when = format.dateTime(new Date(`${last.session.date}T12:00:00`), { day: "numeric", month: "short" });
          return `${t("lastTime", { date: when })}: ${fmt.sets(last.sets.filter((s) => !s.is_warmup))}`;
        })()}
        onSave={(values) => void saveSet(values)}
        onDelete={() => void removeSet()}
      />
      <ExerciseMenu
        open={sheet?.type === "menu"}
        onOpenChange={closeSheet}
        item={menuItem}
        name={menuItem ? nameOf(menuItem.exercise_id) : ""}
        sets={menuItem ? setsOf(menuItem) : []}
        index={menuItem ? items.indexOf(menuItem) : -1}
        count={items.length}
        live={live}
        onSwap={() => menuItem && setSheet({ type: "swap", itemId: menuItem.id })}
      />
      <ExercisePicker
        open={sheet?.type === "add"}
        onOpenChange={closeSheet}
        onPick={(ids) => addSessionExercises(db, session, ids)}
      />
      <ExercisePicker
        open={sheet?.type === "swap"}
        onOpenChange={closeSheet}
        single
        title={t("swapTitle")}
        onPick={async ([id]) => {
          if (swapItem && id) await swapSessionExercise(db, swapItem, id);
        }}
      />
      <FinishSheet
        open={sheet?.type === "finish"}
        onOpenChange={closeSheet}
        session={session}
        pending={pendingTotal}
        names={nameOf}
        onFinished={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />
      <Drawer open={sheet?.type === "options"} onOpenChange={closeSheet} title={t("sessionMenu")} closeLabel={common("close")}>
        <div className="pt-1">
          <ActionList
            actions={[
              {
                key: "discard",
                label: live ? t("discard") : t("deleteSession"),
                Icon: Trash2,
                destructive: true,
                onSelect: () => void discard(),
              },
            ]}
          />
        </div>
      </Drawer>
    </>
  );
}

/** Top of a finished session: the check, the numbers and the records. */
function CompletedCard({ session, names }: { session: Session; names: (exerciseId: string) => string }) {
  const t = useTranslations("session");
  const { db } = useUserData();
  const summary = useLiveQuery(() => sessionSummary(db, session), [db, session]);
  return (
    <div className="flex flex-col gap-3">
      <Card size="lg" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-done text-white"
          >
            <CircleCheck className="size-7" strokeWidth={2.2} />
          </motion.span>
          <div className="min-w-0">
            <h2 className="text-title-2">{t("completedTitle")}</h2>
            {session.rpe ? <p className="text-subhead text-muted-foreground">{t("rpe", { value: session.rpe })}</p> : null}
          </div>
        </div>
        {session.notes ? <p className="text-subhead whitespace-pre-line text-muted-foreground">{session.notes}</p> : null}
      </Card>
      {summary ? <SessionStats summary={summary} names={names} look="cards" /> : null}
    </div>
  );
}
