"use client";

import { ChevronDown, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Spinner } from "@/components/ui/spinner";
import { buildSearchIndex, EMPTY_FILTERS, type ExerciseFilters, searchExercises } from "@/domain/exercises/search";
import { EQUIPMENT, MUSCLES } from "@/domain/exercises/taxonomy";
import { usePrefs } from "@/features/preferences/prefs";
import { cn } from "@/lib/utils";
import { ExerciseRow } from "./exercise-row";
import { FilterSheet } from "./filter-sheet";
import { useCatalogNames, useExercises } from "./use-exercises";
import { useExerciseLabels } from "./use-exercise-labels";
import { useSessionState } from "./use-session-state";

const PAGE_SIZE = 40;

export function ExerciseLibrary() {
  const t = useTranslations("exercises");
  const { locale } = usePrefs();
  const exercises = useExercises();
  const names = useCatalogNames();
  const labels = useExerciseLabels();

  const [filters, setFilters] = useSessionState<ExerciseFilters>("forja.exerciseFilters", EMPTY_FILTERS);
  const [sheet, setSheet] = useState<"muscle" | "equipment" | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const deferredFilters = useDeferredValue(filters);

  const index = useMemo(
    () => (exercises ? buildSearchIndex(exercises, names, labels) : []),
    [exercises, names, labels],
  );
  const results = useMemo(
    () => searchExercises(index, deferredFilters, locale),
    [index, deferredFilters, locale],
  );

  // Start from the top of the list whenever the search changes.
  const [lastFilters, setLastFilters] = useState(filters);
  if (lastFilters !== filters) {
    setLastFilters(filters);
    setVisible(PAGE_SIZE);
  }

  // Render progressively: more rows appear as you scroll near the end.
  const sentinel = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible((count) => count + PAGE_SIZE);
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [results.length]);

  const update = (patch: Partial<ExerciseFilters>) => setFilters({ ...filters, ...patch });
  const hasFilters = Boolean(filters.query || filters.muscle || filters.equipment || filters.onlyCustom);

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-30 border-b bg-background/95 px-4 pt-2 pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <label className="relative block">
          <span className="sr-only">{t("searchPlaceholder")}</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder={t("searchPlaceholder")}
            className="h-12 w-full rounded-full border border-input bg-surface pr-12 pl-11 text-base placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query ? (
            <button
              type="button"
              aria-label={t("clearSearch")}
              onClick={() => update({ query: "" })}
              className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </label>

        <div role="group" aria-label={t("filters.label")} className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          <Chip active={Boolean(filters.muscle)} onClick={() => setSheet("muscle")}>
            {filters.muscle ? labels.muscle(filters.muscle) : t("filters.muscle")}
            <ChevronDown aria-hidden className="size-4" />
          </Chip>
          <Chip active={Boolean(filters.equipment)} onClick={() => setSheet("equipment")}>
            {filters.equipment ? labels.equipment(filters.equipment) : t("filters.equipment")}
            <ChevronDown aria-hidden className="size-4" />
          </Chip>
          <Chip active={filters.onlyCustom} aria-pressed={filters.onlyCustom} onClick={() => update({ onlyCustom: !filters.onlyCustom })}>
            {t("filters.mine")}
          </Chip>
        </div>
      </div>

      {exercises === undefined ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : (
        <>
          <p aria-live="polite" className="px-4 pt-3 pb-1 text-sm text-muted-foreground">
            {t("count", { count: results.length })}
          </p>
          {results.length === 0 ? (
            <div className="flex flex-col items-start gap-3 px-4 py-6">
              <p className="heading text-xl">{t("noResultsTitle")}</p>
              <p className="text-muted-foreground">{t("noResultsBody")}</p>
              <div className="flex flex-wrap gap-2">
                {hasFilters ? (
                  <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                    {t("clearFilters")}
                  </Button>
                ) : null}
                <Link href="/exercises/edit" className={buttonVariants()}>
                  {t("create")}
                </Link>
              </div>
            </div>
          ) : (
            <ul>
              {results.slice(0, visible).map((entry) => (
                <ExerciseRow
                  key={entry.exercise.id}
                  entry={entry}
                  muscleLabel={labels.muscle(entry.exercise.primary_muscle)}
                  equipmentLabel={entry.exercise.equipment ? labels.equipment(entry.exercise.equipment) : null}
                  customLabel={t("custom")}
                />
              ))}
              {visible < results.length ? <li ref={sentinel} aria-hidden className="h-px" /> : null}
            </ul>
          )}
        </>
      )}

      <Link
        href="/exercises/edit"
        aria-label={t("create")}
        className={cn(
          buttonVariants({ size: "icon" }),
          "fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 size-14 rounded-full shadow-lg shadow-black/30",
        )}
      >
        <Plus className="size-7" />
      </Link>

      <FilterSheet
        open={sheet === "muscle"}
        onOpenChange={(open) => setSheet(open ? "muscle" : null)}
        title={t("filters.muscle")}
        options={MUSCLES}
        value={filters.muscle}
        label={labels.muscle}
        onSelect={(muscle) => update({ muscle })}
      />
      <FilterSheet
        open={sheet === "equipment"}
        onOpenChange={(open) => setSheet(open ? "equipment" : null)}
        title={t("filters.equipment")}
        options={EQUIPMENT}
        value={filters.equipment}
        label={labels.equipment}
        onSelect={(equipment) => update({ equipment })}
      />
    </div>
  );
}
