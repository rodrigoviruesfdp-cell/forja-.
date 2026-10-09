"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { Stagger } from "@/components/motion/stagger";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Spinner } from "@/components/ui/spinner";
import { buildSearchIndex, EMPTY_FILTERS, type ExerciseFilters, searchExercises } from "@/domain/exercises/search";
import { EQUIPMENT, MUSCLES } from "@/domain/exercises/taxonomy";
import { usePrefs } from "@/features/preferences/prefs";
import { useStuck } from "@/features/shell/use-stuck";
import { ExerciseRow } from "./exercise-row";
import { FilterSheet } from "./filter-sheet";
import { useCatalogNames, useExercises } from "./use-exercises";
import { useExerciseLabels } from "./use-exercise-labels";
import { useSessionState } from "./use-session-state";

const PAGE_SIZE = 40;
/** Rows that get the staggered entrance (roughly one screen). */
const ANIMATED_ROWS = 12;

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
  const toolbar = useRef<HTMLDivElement>(null);
  const stuck = useStuck(toolbar);

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
    <div className="pb-6">
      {/* Search + filters stay pinned under the bar; they turn into material once pinned. */}
      <div ref={toolbar} className="sticky top-[var(--nav-h)] z-20">
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: stuck ? 1 : 0 }}
          className="material absolute inset-0 border-b"
        />
        <div className="relative px-4 pt-1 pb-3">
          <label className="relative block">
            <span className="sr-only">{t("searchPlaceholder")}</span>
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
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder={t("searchPlaceholder")}
              className="h-11 w-full rounded-[12px] bg-surface-2 pr-11 pl-10 text-body placeholder:text-tertiary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {filters.query ? (
              <button
                type="button"
                aria-label={t("clearSearch")}
                onClick={() => update({ query: "" })}
                className="absolute touch-target top-1/2 right-1 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center"
              >
                <span className="flex size-[18px] items-center justify-center rounded-full bg-tertiary-foreground text-surface">
                  <X className="size-3" strokeWidth={3.2} />
                </span>
              </button>
            ) : null}
          </label>

          <div role="group" aria-label={t("filters.label")} className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            <Chip active={Boolean(filters.muscle)} onClick={() => setSheet("muscle")}>
              {filters.muscle ? labels.muscle(filters.muscle) : t("filters.muscle")}
              <ChevronDown aria-hidden className="size-4" strokeWidth={2.4} />
            </Chip>
            <Chip active={Boolean(filters.equipment)} onClick={() => setSheet("equipment")}>
              {filters.equipment ? labels.equipment(filters.equipment) : t("filters.equipment")}
              <ChevronDown aria-hidden className="size-4" strokeWidth={2.4} />
            </Chip>
            <Chip
              active={filters.onlyCustom}
              aria-pressed={filters.onlyCustom}
              onClick={() => update({ onlyCustom: !filters.onlyCustom })}
            >
              {t("filters.mine")}
            </Chip>
          </div>
        </div>
      </div>

      {exercises === undefined ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : (
        <>
          <p aria-live="polite" className="tracking-caption px-8 pt-2 pb-1.5 text-footnote text-muted-foreground uppercase">
            {t("count", { count: results.length })}
          </p>
          {results.length === 0 ? (
            <div className="px-4">
              <Card className="flex flex-col items-start gap-3">
                <p className="text-title-3">{t("noResultsTitle")}</p>
                <p className="text-muted-foreground">{t("noResultsBody")}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {hasFilters ? (
                    <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                      {t("clearFilters")}
                    </Button>
                  ) : null}
                  <ButtonLink href="/exercises/edit">{t("create")}</ButtonLink>
                </div>
              </Card>
            </div>
          ) : (
            <Stagger as="ul" className="mx-4 overflow-hidden rounded-[16px] border bg-surface shadow-card">
              {results.slice(0, visible).map((entry, position) => (
                <ExerciseRow
                  key={entry.exercise.id}
                  entry={entry}
                  immediate={position >= ANIMATED_ROWS}
                  muscleLabel={labels.muscle(entry.exercise.primary_muscle)}
                  equipmentLabel={entry.exercise.equipment ? labels.equipment(entry.exercise.equipment) : null}
                  customLabel={t("custom")}
                />
              ))}
              {visible < results.length ? <li ref={sentinel} aria-hidden className="h-px" /> : null}
            </Stagger>
          )}
        </>
      )}

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
