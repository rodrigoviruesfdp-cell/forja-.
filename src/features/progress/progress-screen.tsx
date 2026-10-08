"use client";

import { ChartLine } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { BarList } from "@/components/charts/bar-list";
import { niceCeil } from "@/components/charts/chart-utils";
import { ChartTable } from "@/components/charts/chart-table";
import { type ChartSeries, ChartLegend, ColumnChart } from "@/components/charts/column-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Card } from "@/components/ui/card";
import { Group, GroupRow, GroupRowLink } from "@/components/ui/group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { localDate } from "@/domain/dates";
import { exerciseDisplayName } from "@/domain/exercises/names";
import { bucketsOf, type Period, periodOf, previousPeriod, RANGES, type RangeKey } from "@/domain/progress/period";
import {
  earliestDate,
  exerciseSummaries,
  loadPerBucket,
  minutesPerBucket,
  type ProgressSession,
  type ProgressSet,
  recentRecords,
  setsPerMuscle,
  sportTotals,
  totals,
} from "@/domain/progress/stats";
import { METRIC_KEYS } from "@/domain/sports";
import { useExerciseLabels } from "@/features/exercises/use-exercise-labels";
import { useCatalogNames, useExercises } from "@/features/exercises/use-exercises";
import { PageHeader } from "@/features/shell/page-header";
import { SportIcon } from "@/features/sports/sport-icon";
import { useSportName } from "@/features/sports/use-sport-name";
import { useProgressData, useProgressFormat } from "./use-progress";

export function RangePicker({ value, onChange }: { value: RangeKey; onChange: (range: RangeKey) => void }) {
  const t = useTranslations("progress");
  return (
    <SegmentedControl<RangeKey>
      aria-label={t("range")}
      value={value}
      options={RANGES.map((range) => ({ value: range, label: t(`ranges.${range}`) }))}
      onValueChange={onChange}
    />
  );
}

/** The Progress tab: the period, its numbers, then charts and lists that all follow it. */
export function ProgressScreen() {
  const t = useTranslations("progress");
  const data = useProgressData();
  const [range, setRange] = useState<RangeKey>("3m");

  if (!data) {
    return (
      <>
        <PageHeader title={t("title")} />
        <Spinner className="mx-auto mt-10" />
      </>
    );
  }

  if (data.sessions.length === 0) {
    return (
      <>
        <PageHeader title={t("title")} />
        <div className="px-4 pt-2">
          <Card className="flex flex-col items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-concentric bg-planned/12 text-planned">
              <ChartLine className="size-6" strokeWidth={1.9} />
            </span>
            <p className="text-callout text-muted-foreground">{t("empty")}</p>
          </Card>
        </div>
      </>
    );
  }

  const period = periodOf(range, localDate(new Date()), earliestDate(data.sessions));
  return (
    <>
      <PageHeader title={t("title")} />
      <Stagger className="flex flex-col gap-6 px-4 pb-8">
        <StaggerItem>
          <RangePicker value={range} onChange={setRange} />
        </StaggerItem>
        <StaggerItem>
          <Kpis sessions={data.sessions} sets={data.sets} period={period} compare={range !== "all"} />
        </StaggerItem>
        <StaggerItem>
          <TrainingCard sessions={data.sessions} period={period} />
        </StaggerItem>
        <MusclesCard sets={data.sets} period={period} />
        <ExercisesGroup sets={data.sets} period={period} />
        <RecordsGroup sets={data.sets} period={period} />
        <SportsGroup sessions={data.sessions} period={period} />
      </Stagger>
    </>
  );
}

function Kpis({ sessions, sets, period, compare }: { sessions: ProgressSession[]; sets: ProgressSet[]; period: Period; compare: boolean }) {
  const t = useTranslations("progress");
  const fmt = useProgressFormat();
  const now = totals(sessions, sets, period);
  const previous = compare ? totals(sessions, sets, previousPeriod(period)) : null;
  // Nothing to compare with before your first sessions.
  const before = previous && previous.sessions > 0 ? previous : null;
  const delta = (current: number, previous: number | undefined, show: (value: number) => string) => {
    if (previous === undefined) return null;
    const change = current - previous;
    if (Math.round(change) === 0) return t("deltaSame");
    return change > 0 ? t("deltaUp", { value: show(change) }) : t("deltaDown", { value: show(-change) });
  };
  const tiles = [
    { key: "sessions", value: String(now.sessions), delta: delta(now.sessions, before?.sessions, String) },
    { key: "time", value: fmt.duration(now.minutes), delta: delta(now.minutes, before?.minutes, (m) => fmt.duration(Math.round(m))) },
    { key: "volume", value: fmt.volume(now.volumeKg), delta: delta(now.volumeKg, before?.volumeKg, fmt.volume) },
    { key: "records", value: String(now.records), delta: delta(now.records, before?.records, String) },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <Card key={tile.key} className="flex flex-col gap-0.5 py-3.5">
          <span className="text-footnote text-muted-foreground">{t(`kpis.${tile.key}`)}</span>
          <span className="font-rounded text-title-2">{tile.value}</span>
          {tile.delta ? <span className="text-caption text-muted-foreground">{tile.delta}</span> : null}
        </Card>
      ))}
    </div>
  );
}

function TrainingCard({ sessions, period }: { sessions: ProgressSession[]; period: Period }) {
  const t = useTranslations("progress");
  const fmt = useProgressFormat();
  const [measure, setMeasure] = useState<"time" | "load">("time");
  const buckets = bucketsOf(period);
  const load = loadPerBucket(sessions, buckets);
  const values = measure === "time" ? minutesPerBucket(sessions, buckets) : load.values;
  const series: ChartSeries[] = [
    { label: t("training.gym"), color: "var(--chart-1)" },
    { label: t("training.sport"), color: "var(--chart-2)" },
  ];
  const show = (value: number) => (measure === "time" ? fmt.duration(Math.round(value)) : fmt.compact(value));
  const unit = buckets[0]?.kind ?? "week";
  const average = values.reduce((sum, value) => sum + value.gym + value.sport, 0) / Math.max(1, values.length);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-headline">{unit === "week" ? t("training.weekly") : t("training.monthly")}</h2>
      </div>
      <SegmentedControl<"time" | "load">
        aria-label={t("training.measure")}
        value={measure}
        options={[
          { value: "time", label: t("training.time") },
          { value: "load", label: t("training.load") },
        ]}
        onValueChange={setMeasure}
      />
      <ChartLegend series={series} />
      <div>
        <ColumnChart
          columns={values.map((value) => ({
            key: value.bucket.start,
            tick: fmt.tick(value.bucket),
            label: fmt.bucketLabel(value.bucket),
            values: [value.gym, value.sport],
          }))}
          series={series}
          format={show}
          formatAxis={measure === "time" ? fmt.hoursAxis : fmt.compact}
          ceil={measure === "time" ? (minutes) => niceCeil(minutes / 60) * 60 : niceCeil}
          totalLabel={t("training.total")}
          summary={<p className="text-footnote text-muted-foreground">{t("training.average", { value: show(average), unit })}</p>}
          ariaLabel={t("training.chart", { measure: t(`training.${measure}`), unit })}
        />
      </div>
      {measure === "load" ? (
        <p className="text-footnote text-muted-foreground">
          {t("training.loadHint")} {load.missing > 0 ? t("training.missing", { count: load.missing }) : null}
        </p>
      ) : null}
      <ChartTable
        label={t("seeData")}
        columns={[t("training.period"), t("training.gym"), t("training.sport")]}
        rows={values.map((value) => ({
          key: value.bucket.start,
          cells: [fmt.bucketLabel(value.bucket), show(value.gym), show(value.sport)],
        }))}
      />
    </Card>
  );
}

function MusclesCard({ sets, period }: { sets: ProgressSet[]; period: Period }) {
  const t = useTranslations("progress");
  const labels = useExerciseLabels();
  const muscles = setsPerMuscle(sets, period);
  if (muscles.length === 0) return null;
  return (
    <StaggerItem>
      <Card className="flex flex-col gap-3">
        <h2 className="text-headline">{t("muscles.title")}</h2>
        <BarList
          ariaLabel={t("muscles.chart")}
          items={muscles.map((item) => ({
            key: item.muscle,
            label: labels.muscle(item.muscle),
            value: item.perWeek,
            display: t("muscles.perWeek", { value: item.perWeek }),
          }))}
        />
        <p className="text-footnote text-muted-foreground">{t("muscles.hint")}</p>
      </Card>
    </StaggerItem>
  );
}

function useExerciseNames() {
  const exercises = useExercises();
  const names = useCatalogNames();
  const byId = new Map((exercises ?? []).map((exercise) => [exercise.id, exercise]));
  return (id: string) => {
    const exercise = byId.get(id);
    return exercise ? exerciseDisplayName(exercise, names) : "—";
  };
}

function ExercisesGroup({ sets, period }: { sets: ProgressSet[]; period: Period }) {
  const t = useTranslations("progress");
  const fmt = useProgressFormat();
  const name = useExerciseNames();
  const summaries = exerciseSummaries(sets, period);
  if (summaries.length === 0) return null;
  return (
    <StaggerItem>
      <Group title={t("exercises.title")}>
        {summaries.map((summary) => (
          <GroupRowLink key={summary.exerciseId} href={`/progress/exercise?id=${summary.exerciseId}`} data-nav="forward">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="line-clamp-2 leading-snug">{name(summary.exerciseId)}</span>
              <span className="truncate text-footnote text-muted-foreground">
                {t("exercises.sessions", { count: summary.sessions })} · {t(`metrics.${summary.metric}`)}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-rounded text-subhead font-semibold whitespace-nowrap">{fmt.metric(summary.metric, summary.latest)}</span>
              <Sparkline values={summary.trend} width={56} height={18} />
            </span>
          </GroupRowLink>
        ))}
      </Group>
    </StaggerItem>
  );
}

function RecordsGroup({ sets, period }: { sets: ProgressSet[]; period: Period }) {
  const t = useTranslations("progress");
  const fmt = useProgressFormat();
  const name = useExerciseNames();
  const records = recentRecords(sets, period);
  if (records.length === 0) return null;
  return (
    <StaggerItem>
      <Group title={t("records.title")}>
        {records.map((set) => (
          <GroupRowLink key={set.id} href={`/progress/exercise?id=${set.exerciseId}`} data-nav="forward">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pr/12 text-caption-2 font-bold text-pr">PR</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="line-clamp-2 leading-snug">{name(set.exerciseId)}</span>
              <span className="text-footnote text-muted-foreground">{fmt.shortDate(set.date)}</span>
            </span>
            <span className="shrink-0 font-rounded text-subhead font-semibold whitespace-nowrap">{fmt.set(set.weightKg, set.reps)}</span>
          </GroupRowLink>
        ))}
      </Group>
    </StaggerItem>
  );
}

function SportsGroup({ sessions, period }: { sessions: ProgressSession[]; period: Period }) {
  const t = useTranslations("progress");
  const tSport = useTranslations("sportLog");
  const fmt = useProgressFormat();
  const sportName = useSportName();
  const sports = sportTotals(sessions, period);
  if (sports.length === 0) return null;
  return (
    <StaggerItem>
      <Group title={t("sports.title")}>
        {sports.map((sport) => (
          <GroupRow key={sport.sport} className="[--sep-inset:3.25rem]">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-chart-2/15 text-chart-2">
              <SportIcon kind="sport" sport={sport.sport} className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{sportName(sport.sport)}</span>
              <span className="truncate text-footnote text-muted-foreground">
                {[
                  t("exercises.sessions", { count: sport.sessions }),
                  sport.distanceKm > 0 ? fmt.km(sport.distanceKm) : null,
                  ...METRIC_KEYS.map((key) => (sport.metrics[key] ? tSport(`counts.${key}`, { count: sport.metrics[key] }) : null)),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="shrink-0 font-rounded text-subhead font-semibold">{fmt.duration(sport.minutes)}</span>
          </GroupRow>
        ))}
      </Group>
    </StaggerItem>
  );
}
