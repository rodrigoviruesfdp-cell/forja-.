"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { StaggerItem } from "@/components/motion/stagger";
import type { SearchEntry } from "@/domain/exercises/search";
import { ExerciseImage } from "./exercise-image";

interface ExerciseRowProps {
  entry: SearchEntry;
  muscleLabel: string;
  equipmentLabel: string | null;
  customLabel: string;
  /** Rows beyond the first screen appear without the entrance animation. */
  immediate?: boolean;
}

/** Table cell: thumbnail, name, muscle · equipment. Hairline starts after the thumbnail. */
export const ExerciseRow = memo(function ExerciseRow({
  entry,
  muscleLabel,
  equipmentLabel,
  customLabel,
  immediate = false,
}: ExerciseRowProps) {
  const { exercise, displayName } = entry;
  return (
    <StaggerItem
      as="li"
      immediate={immediate}
      className="relative [--sep-inset:5.25rem] after:absolute after:right-0 after:bottom-0 after:left-[var(--sep-inset)] after:h-px after:origin-bottom after:scale-y-50 after:bg-separator last:after:hidden"
    >
      <Link
        href={`/exercises/detail?id=${exercise.id}`}
        className="flex min-h-[4.5rem] items-center gap-3 py-2.5 pr-3 pl-4 active:bg-surface-2"
      >
        <ExerciseImage src={exercise.image_urls[0]} alt="" className="size-13 shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{displayName}</p>
          <p className="truncate text-subhead text-muted-foreground">
            {equipmentLabel ? `${muscleLabel} · ${equipmentLabel}` : muscleLabel}
          </p>
        </div>
        {exercise.created_by ? (
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-caption font-semibold text-muted-foreground">
            {customLabel}
          </span>
        ) : null}
        <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />
      </Link>
    </StaggerItem>
  );
});
