"use client";

import { Ellipsis, GripVertical, Plus } from "lucide-react";
import { motion, Reorder, useDragControls } from "motion/react";
import { type ReactNode, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { PRESS } from "@/components/motion/spring";
import { reorderExercises } from "@/data/repositories/routines";
import { targetLabel } from "@/domain/routines/builder";
import type { Exercise, RoutineDay, RoutineExercise } from "@/domain/schemas";
import { ExerciseImage } from "@/features/exercises/exercise-image";
import { useUserData } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";

const separator =
  "relative after:absolute after:right-0 after:bottom-0 after:left-[4.25rem] after:h-px after:origin-bottom after:scale-y-50 after:bg-separator";

interface DayCardProps {
  day: RoutineDay;
  /** Letter tile (rotation), icon tile (sport/weekly)… */
  badge: ReactNode;
  title: string;
  subtitle: string;
  items: RoutineExercise[];
  catalog: Map<string, Exercise>;
  displayName: (exercise: Exercise | undefined) => string;
  onAddExercise: () => void;
  onOpenItem: (item: RoutineExercise) => void;
  onActions: () => void;
}

/**
 * One training day as an inset grouped card: header (badge, name, ⋯), its exercises
 * (drag the handle to reorder: the row lifts and the rest make room, on springs) and an
 * "Add exercise" row. Sport days have no exercise list.
 */
export function DayCard({
  day,
  badge,
  title,
  subtitle,
  items,
  catalog,
  displayName,
  onAddExercise,
  onOpenItem,
  onActions,
}: DayCardProps) {
  const t = useTranslations("routines");
  const common = useTranslations("common");
  const { db } = useUserData();

  // Local order while dragging; the database is written once, when the drag ends.
  const ids = items.map((item) => item.id);
  const key = ids.join(",");
  const [order, setOrder] = useState(ids);
  const [syncedKey, setSyncedKey] = useState(key);
  const [dragging, setDragging] = useState(false);
  const latestOrder = useRef(ids);
  if (!dragging && key !== syncedKey) {
    setSyncedKey(key);
    setOrder(ids);
  }
  const byId = new Map(items.map((item) => [item.id, item]));

  function handleDragEnd() {
    setDragging(false);
    const next = latestOrder.current;
    if (next.join(",") !== key) void reorderExercises(db, day.id, next);
  }

  return (
    <article className="overflow-hidden rounded-[22px] border bg-surface shadow-card">
      <header className={cn("flex items-center gap-3 p-3", (day.kind === "gym" || items.length > 0) && separator, "after:left-0")}>
        {badge}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-headline">{title}</h3>
          <p className="truncate text-subhead text-muted-foreground">{subtitle}</p>
        </div>
        <motion.button
          type="button"
          aria-label={`${common("more")}: ${title}`}
          onClick={onActions}
          {...PRESS}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-foreground"
        >
          <Ellipsis className="size-5" strokeWidth={2.4} />
        </motion.button>
      </header>

      {day.kind === "gym" ? (
        <>
          <Reorder.Group
            as="ul"
            axis="y"
            values={order}
            onReorder={(next: string[]) => {
              latestOrder.current = next;
              setOrder(next);
            }}
          >
            {order.map((id) => {
              const item = byId.get(id);
              if (!item) return null;
              const exercise = catalog.get(item.exercise_id);
              return (
                <ExerciseItem
                  key={id}
                  item={item}
                  exercise={exercise}
                  name={displayName(exercise)}
                  dragLabel={t("dragHandle")}
                  onOpen={() => onOpenItem(item)}
                  onDragStart={() => {
                    latestOrder.current = order;
                    setDragging(true);
                  }}
                  onDragEnd={handleDragEnd}
                />
              );
            })}
          </Reorder.Group>
          <button
            type="button"
            onClick={onAddExercise}
            className="flex h-12 w-full cursor-pointer items-center gap-3 px-4 text-left font-medium text-planned active:bg-surface-2"
          >
            <Plus className="size-5" strokeWidth={2.4} />
            {t("addExercise")}
          </button>
        </>
      ) : null}
    </article>
  );
}

function ExerciseItem({
  item,
  exercise,
  name,
  dragLabel,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  item: RoutineExercise;
  exercise: Exercise | undefined;
  name: string;
  dragLabel: string;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="li"
      value={item.id}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.03, boxShadow: "0 16px 40px rgb(0 0 0 / 0.18)", borderRadius: 14, zIndex: 10 }}
      className={cn("relative bg-surface", separator)}
    >
      <div className="flex items-center gap-3 py-2 pl-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
          <ExerciseImage src={exercise?.image_urls[0]} alt="" className="size-11 shrink-0 rounded-[10px]" />
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate font-medium", !exercise || exercise.deleted_at ? "text-muted-foreground" : "")}>
              {name}
            </span>
            <span className="numeric block text-subhead text-muted-foreground">{targetLabel(item)}</span>
          </span>
        </button>
        <button
          type="button"
          aria-label={`${dragLabel}: ${name}`}
          onPointerDown={(event) => controls.start(event)}
          className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-tertiary-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-5" />
        </button>
      </div>
    </Reorder.Item>
  );
}
