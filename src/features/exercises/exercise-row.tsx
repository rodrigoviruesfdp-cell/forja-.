import Link from "next/link";
import { memo } from "react";
import type { SearchEntry } from "@/domain/exercises/search";
import { ExerciseImage } from "./exercise-image";

interface ExerciseRowProps {
  entry: SearchEntry;
  muscleLabel: string;
  equipmentLabel: string | null;
  customLabel: string;
}

export const ExerciseRow = memo(function ExerciseRow({ entry, muscleLabel, equipmentLabel, customLabel }: ExerciseRowProps) {
  const { exercise, displayName } = entry;
  return (
    <li>
      <Link
        href={`/exercises/detail?id=${exercise.id}`}
        className="flex min-h-18 items-center gap-3 px-4 py-2 active:bg-surface-2"
      >
        <ExerciseImage src={exercise.image_urls[0]} alt="" className="size-14 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{displayName}</p>
          <p className="flex gap-2 truncate text-sm">
            <span className="text-foreground/80">{muscleLabel}</span>
            {equipmentLabel ? <span className="text-muted-foreground">{equipmentLabel}</span> : null}
          </p>
        </div>
        {exercise.created_by ? (
          <span className="shrink-0 rounded-full border border-primary/60 px-2 py-0.5 text-xs font-semibold text-primary">
            {customLabel}
          </span>
        ) : null}
      </Link>
    </li>
  );
});
