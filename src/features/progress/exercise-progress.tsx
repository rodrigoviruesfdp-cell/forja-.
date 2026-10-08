"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { LineChart } from "@/components/charts/line-chart";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Card } from "@/components/ui/card";
import { Group, GroupRow, GroupRowLink } from "@/components/ui/group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { localDate } from "@/domain/dates";
import { exerciseDisplayName } from "@/domain/exercises/names";
import { inPeriod, periodOf, type RangeKey } from "@/domain/progress/period";
import { earliestDate, type ExerciseMetric, exerciseHistory, metricsFor, metricValue } from "@/domain/progress/stats";
import { useExerciseLabels } from "@/features/exercises/use-exercise-labels";
import { useCatalogNames, useExercise } from "@/features/exercises/use-exercises";
import { PageHeader } from "@/features/shell/page-header";
import { RangePicker } from "./progress-screen";
import { useProgressData, useProgressFormat } from "./use-progress";

/** /progress/exercise?id=…: one exercise over time, session by session. */
export function ExerciseProgressScreen() {
  const t = useTranslations("progress");
  const fmt = useProgressFormat();
  const labels = useExerciseLabels();
  const names = useCatalogNames();
  const params = useSearchParams();
  const id = params.get("id");
  const exercise = useExercise(id);
  const data = useProgressData();
  const [range, setRange] = useState<RangeKey>("all");
  const [chosen, setChosen] = useState<ExerciseMetric | null>(null);

  if (exercise === undefined || !data) {
    return (
      <>
        <PageHeader title={t("title")} backFallback="/progress" compact />
        <Spinner className="mx-auto mt-10" />
      </>
    );
  }
  if (!exercise) {
    return (
      <>
        <PageHeader title={t("title")} backFallback="/progress" compact />
        <p className="px-4 pt-2 text-muted-foreground">{t("exercise.notFound")}</p>
      </>
    );
  }

  const name = exerciseDisplayName(exercise, names);
  const all = data.sets.filter((set) => set.exerciseId === exercise.id);
  const period = periodOf(range, localDate(new Date()), earliestDate(data.sessions));
  const history = exerciseHistory(all);
  const points = history.filter((point) => inPeriod(point.date, period));
  const metrics = metricsFor(history);
  const metric = chosen && metrics.includes(chosen) ? chosen : (metrics[0] as ExerciseMetric);
  const charted = points
    .map((point) => ({ point, value: metricValue(point, metric) }))
    .filter((item): item is { point: (typeof points)[number]; value: number } => item.value !== null);
  const bestEver = Math.max(...history.map((point) => metricValue(point, metric) ?? 0));
  const latest = charted.at(-1)?.value;
  const topSet = (point: (typeof points)[number]) => fmt.set(point.weightKg, point.weightKg > 0 ? point.repsAtWeight : point.maxReps);

  return (
    <>
      <PageHeader title={name} subtitle={labels.muscle(exercise.primary_muscle)} backFallback="/progress" />
      <Stagger className="flex flex-col gap-6 px-4 pb-8">
        <StaggerItem>
          <RangePicker value={range} onChange={setRange} />
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "best", value: history.length > 0 ? fmt.metric(metric, bestEver) : "—" },
              { key: "latest", value: latest !== undefined ? fmt.metric(metric, latest) : "—" },
              { key: "sessions", value: String(points.length) },
            ].map((tile) => (
              <Card key={tile.key} className="flex flex-col gap-0.5 px-3 py-3">
                <span className="text-footnote text-muted-foreground">{t(`exercise.${tile.key as "best" | "latest" | "sessions"}`)}</span>
                <span className="truncate font-rounded text-headline">{tile.value}</span>
              </Card>
            ))}
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="flex flex-col gap-3">
            {metrics.length > 1 ? (
              <SegmentedControl<ExerciseMetric>
                aria-label={t("exercise.metric")}
                value={metric}
                options={metrics.map((value) => ({ value, label: t(`metricsShort.${value}`) }))}
                onValueChange={setChosen}
              />
            ) : (
              <h2 className="text-headline">{t(`metrics.${metric}`)}</h2>
            )}
            {charted.length > 0 ? (
              <div>
                <LineChart
                  points={charted.map(({ point, value }) => ({
                    key: point.sessionId,
                    date: point.date,
                    value: fmt.toDisplay(metric, value),
                    label: fmt.date(point.date),
                    detail: topSet(point),
                    highlight: point.isPr,
                  }))}
                  format={(value) => fmt.displayed(metric, value)}
                  formatAxis={(value) => fmt.displayedAxis(metric, value)}
                  formatDate={fmt.shortDate}
                  highlightLabel={t("exercise.record")}
                  ariaLabel={t("exercise.chart", { metric: t(`metrics.${metric}`), name })}
                />
              </div>
            ) : (
              <p className="py-6 text-center text-footnote text-muted-foreground">{t("exercise.noData")}</p>
            )}
            {metric === "e1rm" ? <p className="text-footnote text-muted-foreground">{t("exercise.e1rmHint")}</p> : null}
          </Card>
        </StaggerItem>

        {charted.length > 0 ? (
          <StaggerItem>
            <Group title={t("exercise.history")}>
              {[...charted].reverse().map(({ point, value }) => (
                <GroupRow key={point.sessionId}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span>{fmt.date(point.date)}</span>
                    <span className="text-footnote text-muted-foreground">
                      {t("exercise.bestSet")}: {topSet(point)}
                    </span>
                  </span>
                  {point.isPr ? (
                    <span className="rounded-full bg-pr/12 px-2 py-0.5 text-caption-2 font-bold text-pr">PR</span>
                  ) : null}
                  <span className="shrink-0 font-rounded text-subhead font-semibold">{fmt.metric(metric, value)}</span>
                </GroupRow>
              ))}
            </Group>
          </StaggerItem>
        ) : null}

        <StaggerItem>
          <Group>
            <GroupRowLink href={`/exercises/detail?id=${exercise.id}`} data-nav="forward" className="font-medium text-planned">
              {t("exercise.seeExercise")}
            </GroupRowLink>
          </Group>
        </StaggerItem>
      </Stagger>
    </>
  );
}
