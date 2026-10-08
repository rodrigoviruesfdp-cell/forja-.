"use client";

import { Check, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { addExercises } from "@/data/repositories/routines";
import { buildSearchIndex, EMPTY_FILTERS, searchExercises } from "@/domain/exercises/search";
import type { RoutineDay } from "@/domain/schemas";
import { ExerciseImage } from "@/features/exercises/exercise-image";
import { useCatalogNames, useExercises } from "@/features/exercises/use-exercises";
import { useExerciseLabels } from "@/features/exercises/use-exercise-labels";
import { usePrefs } from "@/features/preferences/prefs";
import { useUserData } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";

/** Rows rendered at once; typing narrows the list further. */
const LIMIT = 80;

/**
 * Pick several exercises for a day: instant search (same engine as the library),
 * tap to select (blue check, in the order you tap), then add them all at once.
 */
export function ExercisePicker({
  open,
  onOpenChange,
  day,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: RoutineDay | null;
}) {
  const t = useTranslations("routines.picker");
  const tExercises = useTranslations("exercises");
  const common = useTranslations("common");
  const { db } = useUserData();
  const { locale } = usePrefs();
  const exercises = useExercises();
  const names = useCatalogNames();
  const labels = useExerciseLabels();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);

  const index = useMemo(() => (exercises ? buildSearchIndex(exercises, names, labels) : []), [exercises, names, labels]);
  const results = useMemo(
    () => searchExercises(index, { ...EMPTY_FILTERS, query: deferredQuery }, locale),
    [index, deferredQuery, locale],
  );

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function reset() {
    setQuery("");
    setSelected([]);
  }

  async function add() {
    if (!day || selected.length === 0) return;
    await addExercises(db, day, selected);
    toast.success(t("added", { count: selected.length }));
    onOpenChange(false);
    reset();
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
      title={t("title")}
      closeLabel={common("cancel")}
      tall
      footer={
        <Button size="lg" className="w-full" disabled={selected.length === 0} onClick={() => void add()}>
          {t("add", { count: selected.length })}
        </Button>
      }
    >
      {/* Pinned search: the list scrolls under it, blurred (material inside the sheet). */}
      <div className="material-thick sticky top-0 z-10 -mx-4 px-4 pb-3">
        <label className="relative block">
          <span className="sr-only">{tExercises("searchPlaceholder")}</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-tertiary-foreground"
            strokeWidth={2.4}
          />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tExercises("searchPlaceholder")}
            className="h-11 w-full rounded-[12px] bg-surface-2 pr-4 pl-10 text-body placeholder:text-tertiary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      </div>

      <ul className="overflow-hidden rounded-[12px] bg-surface">
        {results.slice(0, LIMIT).map(({ exercise, displayName }) => {
          const order = selected.indexOf(exercise.id);
          const on = order >= 0;
          return (
            <li
              key={exercise.id}
              className="relative after:absolute after:right-0 after:bottom-0 after:left-[4.5rem] after:h-px after:origin-bottom after:scale-y-50 after:bg-separator last:after:hidden"
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(exercise.id)}
                className="flex min-h-16 w-full cursor-pointer items-center gap-3 py-2 pr-4 pl-3 text-left active:bg-surface-2"
              >
                <ExerciseImage src={exercise.image_urls[0]} alt="" className="size-12 shrink-0 rounded-[10px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{displayName}</span>
                  <span className="block truncate text-subhead text-muted-foreground">
                    {labels.muscle(exercise.primary_muscle)}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                    on ? "border-planned bg-planned text-white" : "border-surface-3",
                  )}
                >
                  <AnimatePresence initial={false}>
                    {on ? (
                      <motion.span key="check" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
                        <Check className="size-3.5" strokeWidth={3.4} />
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {results.length > LIMIT ? (
        <p className="px-4 pt-3 text-center text-footnote text-muted-foreground">
          {tExercises("count", { count: results.length })}
        </p>
      ) : null}
    </Drawer>
  );
}
