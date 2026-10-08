/**
 * The numbers of the Progress screen, from your completed sessions and their work sets.
 * Everything is in kilos and minutes; the screens convert to the user's unit.
 */
import { estimateOneRepMax } from "../sessions/one-rep-max";
import { canonicalSport, METRIC_KEYS } from "../sports";
import { type Bucket, bucketIndex, inPeriod, type Period, weeksIn } from "./period";

/** A completed session (gym or sport). */
export interface ProgressSession {
  id: string;
  date: string;
  kind: "gym" | "sport";
  sport: string | null;
  durationMin: number | null;
  rpe: number | null;
  distanceKm: number | null;
  metrics: Readonly<Record<string, number>>;
}

/** A work set (no warm-ups) of a completed gym session. */
export interface ProgressSet {
  id: string;
  sessionId: string;
  date: string;
  completedAt: string;
  exerciseId: string;
  /** The exercise's main muscle (null if the exercise is gone). */
  muscle: string | null;
  weightKg: number;
  reps: number;
  isPr: boolean;
}

// ---------------------------------------------------------------------------
// Totals

export interface Totals {
  sessions: number;
  minutes: number;
  volumeKg: number;
  records: number;
}

export function totals(sessions: readonly ProgressSession[], sets: readonly ProgressSet[], period: Period): Totals {
  const result: Totals = { sessions: 0, minutes: 0, volumeKg: 0, records: 0 };
  for (const session of sessions) {
    if (!inPeriod(session.date, period)) continue;
    result.sessions += 1;
    result.minutes += session.durationMin ?? 0;
  }
  for (const set of sets) {
    if (!inPeriod(set.date, period)) continue;
    result.volumeKg += set.weightKg * set.reps;
    if (set.isPr) result.records += 1;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Time and load per week (or month), gym and sports apart

export interface SplitValue {
  bucket: Bucket;
  gym: number;
  sport: number;
}

function perBucket(
  sessions: readonly ProgressSession[],
  buckets: readonly Bucket[],
  value: (session: ProgressSession) => number | null,
): SplitValue[] {
  const result = buckets.map((bucket) => ({ bucket, gym: 0, sport: 0 }));
  for (const session of sessions) {
    const index = bucketIndex(buckets, session.date);
    const amount = value(session);
    if (index < 0 || amount === null) continue;
    const row = result[index] as SplitValue;
    row[session.kind] += amount;
  }
  return result;
}

/** Minutes trained. */
export function minutesPerBucket(sessions: readonly ProgressSession[], buckets: readonly Bucket[]): SplitValue[] {
  return perBucket(sessions, buckets, (session) => session.durationMin ?? 0);
}

/**
 * Training load: minutes × effort (1–10) of each session ("session RPE"). Sessions without
 * effort or duration do not count; `missing` says how many, so the chart can tell you.
 */
export function loadPerBucket(
  sessions: readonly ProgressSession[],
  buckets: readonly Bucket[],
): { values: SplitValue[]; missing: number } {
  const first = buckets[0]?.start ?? "";
  const last = buckets.at(-1)?.end ?? "";
  const missing = sessions.filter(
    (session) => session.date >= first && session.date <= last && (session.rpe === null || !session.durationMin),
  ).length;
  const values = perBucket(sessions, buckets, (session) =>
    session.rpe !== null && session.durationMin ? session.durationMin * session.rpe : null,
  );
  return { values, missing };
}

// ---------------------------------------------------------------------------
// Sets per muscle

export interface MuscleSets {
  muscle: string;
  sets: number;
  /** Average sets a week over the period. */
  perWeek: number;
}

/** Work sets per main muscle, most trained first (the usual measure of training volume). */
export function setsPerMuscle(sets: readonly ProgressSet[], period: Period): MuscleSets[] {
  const counts = new Map<string, number>();
  for (const set of sets) {
    if (!set.muscle || !inPeriod(set.date, period)) continue;
    counts.set(set.muscle, (counts.get(set.muscle) ?? 0) + 1);
  }
  const weeks = weeksIn(period);
  return [...counts]
    .map(([muscle, count]) => ({ muscle, sets: count, perWeek: Math.round((count / weeks) * 10) / 10 }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
}

// ---------------------------------------------------------------------------
// One exercise over time

export type ExerciseMetric = "e1rm" | "weight" | "volume" | "reps";

/** One session of an exercise. */
export interface ExercisePoint {
  sessionId: string;
  date: string;
  /** Best estimated one-rep max of the session (null if no set had ≤ 12 reps with weight). */
  e1rmKg: number | null;
  /** Heaviest set, and its reps. */
  weightKg: number;
  repsAtWeight: number;
  /** Most reps in a set (what counts without added weight). */
  maxReps: number;
  volumeKg: number;
  sets: number;
  /** A record was set in this session. */
  isPr: boolean;
}

/** One point per session, oldest first. */
export function exerciseHistory(sets: readonly ProgressSet[]): ExercisePoint[] {
  const bySession = new Map<string, ProgressSet[]>();
  for (const set of sets) bySession.set(set.sessionId, [...(bySession.get(set.sessionId) ?? []), set]);
  const points = [...bySession.values()].map((group) => {
    const first = group[0] as ProgressSet;
    const heaviest = group.reduce(
      (best, set) => (set.weightKg > best.weightKg || (set.weightKg === best.weightKg && set.reps > best.reps) ? set : best),
      first,
    );
    const e1rms = group.map((set) => estimateOneRepMax(set.weightKg, set.reps)).filter((value): value is number => value !== null);
    const point: ExercisePoint = {
      sessionId: first.sessionId,
      date: first.date,
      e1rmKg: e1rms.length > 0 ? Math.max(...e1rms) : null,
      weightKg: heaviest.weightKg,
      repsAtWeight: heaviest.reps,
      maxReps: Math.max(...group.map((set) => set.reps)),
      volumeKg: group.reduce((sum, set) => sum + set.weightKg * set.reps, 0),
      sets: group.length,
      isPr: group.some((set) => set.isPr),
    };
    // Two sessions on the same day go in the order they were done.
    const startedAt = group.reduce((min, set) => (set.completedAt < min ? set.completedAt : min), first.completedAt);
    return { point, order: `${point.date}|${startedAt}` };
  });
  return points.sort((a, b) => a.order.localeCompare(b.order)).map((item) => item.point);
}

/** What can be charted for an exercise: with weight, its strength; without, its reps. */
export function metricsFor(points: readonly ExercisePoint[]): ExerciseMetric[] {
  if (!points.some((point) => point.weightKg > 0)) return ["reps"];
  return points.some((point) => point.e1rmKg !== null) ? ["e1rm", "weight", "volume"] : ["weight", "volume"];
}

export function metricValue(point: ExercisePoint, metric: ExerciseMetric): number | null {
  switch (metric) {
    case "e1rm":
      return point.e1rmKg;
    case "weight":
      return point.weightKg > 0 ? point.weightKg : null;
    case "volume":
      return point.volumeKg > 0 ? point.volumeKg : null;
    case "reps":
      return point.maxReps;
  }
}

export interface ExerciseSummary {
  exerciseId: string;
  sessions: number;
  lastDate: string;
  metric: ExerciseMetric;
  /** The latest value of the metric, and how it moved since the first session of the period. */
  latest: number;
  change: number | null;
  /** The metric per session, for a sparkline. */
  trend: number[];
}

/** The exercises done in the period, most frequent first. */
export function exerciseSummaries(sets: readonly ProgressSet[], period: Period): ExerciseSummary[] {
  const byExercise = new Map<string, ProgressSet[]>();
  for (const set of sets) {
    if (!inPeriod(set.date, period)) continue;
    byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
  }
  const summaries: ExerciseSummary[] = [];
  for (const [exerciseId, group] of byExercise) {
    const points = exerciseHistory(group);
    const metric = metricsFor(points)[0] as ExerciseMetric;
    const trend = points.map((point) => metricValue(point, metric)).filter((value): value is number => value !== null);
    const latest = trend.at(-1);
    if (latest === undefined) continue;
    summaries.push({
      exerciseId,
      sessions: points.length,
      lastDate: points.at(-1)?.date ?? "",
      metric,
      latest,
      change: trend.length > 1 ? latest - (trend[0] as number) : null,
      trend,
    });
  }
  return summaries.sort((a, b) => b.sessions - a.sessions || b.lastDate.localeCompare(a.lastDate));
}

/** The latest records, newest first. */
export function recentRecords(sets: readonly ProgressSet[], period: Period, limit = 5): ProgressSet[] {
  return sets
    .filter((set) => set.isPr && inPeriod(set.date, period))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Sports

export interface SportTotals {
  sport: string;
  sessions: number;
  minutes: number;
  distanceKm: number;
  metrics: Partial<Record<(typeof METRIC_KEYS)[number], number>>;
}

/** Each sport in the period: sessions, time, distance and what it counts. */
export function sportTotals(sessions: readonly ProgressSession[], period: Period): SportTotals[] {
  const bySport = new Map<string, SportTotals>();
  for (const session of sessions) {
    if (session.kind !== "sport" || !session.sport || !inPeriod(session.date, period)) continue;
    const sport = canonicalSport(session.sport);
    const row = bySport.get(sport.toLocaleLowerCase()) ?? { sport, sessions: 0, minutes: 0, distanceKm: 0, metrics: {} };
    row.sessions += 1;
    row.minutes += session.durationMin ?? 0;
    row.distanceKm += session.distanceKm ?? 0;
    for (const key of METRIC_KEYS) {
      const value = session.metrics[key];
      if (value) row.metrics[key] = (row.metrics[key] ?? 0) + value;
    }
    bySport.set(sport.toLocaleLowerCase(), row);
  }
  return [...bySport.values()].sort((a, b) => b.sessions - a.sessions || b.minutes - a.minutes);
}

/** The first day with a session (where "all time" starts). */
export function earliestDate(sessions: readonly ProgressSession[]): string | null {
  return sessions.reduce<string | null>((min, session) => (!min || session.date < min ? session.date : min), null);
}
