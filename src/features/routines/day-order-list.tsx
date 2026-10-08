"use client";

import { GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { reorderDays } from "@/data/repositories/routines";
import { rotationLetter } from "@/domain/routines/builder";
import type { Routine, RoutineDay } from "@/domain/schemas";
import { useUserData } from "@/features/user-data/user-data-context";

/**
 * "Edit mode" for the rotation: compact rows you drag by the handle. Letters follow the
 * new order live; the database is written when you let go.
 */
export function DayOrderList({ routine, days }: { routine: Routine; days: RoutineDay[] }) {
  const t = useTranslations("routines");
  const { db } = useUserData();
  const ids = days.map((day) => day.id);
  const key = ids.join(",");
  const [order, setOrder] = useState(ids);
  const [syncedKey, setSyncedKey] = useState(key);
  const [dragging, setDragging] = useState(false);
  const latest = useRef(ids);
  if (!dragging && key !== syncedKey) {
    setSyncedKey(key);
    setOrder(ids);
  }
  const byId = new Map(days.map((day) => [day.id, day]));

  return (
    <Reorder.Group
      as="ul"
      axis="y"
      values={order}
      onReorder={(next: string[]) => {
        latest.current = next;
        setOrder(next);
      }}
      className="overflow-hidden rounded-[16px] border bg-surface shadow-card"
    >
      {order.map((id, index) => {
        const day = byId.get(id);
        if (!day) return null;
        return (
          <OrderRow
            key={id}
            id={id}
            letter={rotationLetter(index)}
            name={day.name}
            dragLabel={t("dragHandle")}
            onDragStart={() => {
              latest.current = order;
              setDragging(true);
            }}
            onDragEnd={() => {
              setDragging(false);
              if (latest.current.join(",") !== key) void reorderDays(db, routine, latest.current);
            }}
          />
        );
      })}
    </Reorder.Group>
  );
}

function OrderRow({
  id,
  letter,
  name,
  dragLabel,
  onDragStart,
  onDragEnd,
}: {
  id: string;
  letter: string;
  name: string;
  dragLabel: string;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="li"
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.03, boxShadow: "0 16px 40px rgb(0 0 0 / 0.18)", borderRadius: 14, zIndex: 10 }}
      className="relative flex items-center gap-3 bg-surface py-1.5 pl-3 after:absolute after:right-0 after:bottom-0 after:left-16 after:h-px after:origin-bottom after:scale-y-50 after:bg-separator last:after:hidden"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-foreground font-rounded text-headline text-background">
        {letter}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <button
        type="button"
        aria-label={`${dragLabel}: ${name}`}
        onPointerDown={(event) => controls.start(event)}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-tertiary-foreground"
      >
        <GripVertical className="size-5" />
      </button>
    </Reorder.Item>
  );
}
