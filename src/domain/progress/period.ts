/**
 * The time a progress screen looks at ("last 3 months") and how its charts group it:
 * by week (Monday to Sunday, like the streak) or, for long periods, by month.
 */
import { addDays, dateOf, localDate, mondayOf } from "../dates";

export const RANGES = ["4w", "3m", "1y", "all"] as const;
export type RangeKey = (typeof RANGES)[number];

/** Inclusive yyyy-mm-dd days. */
export interface Period {
  start: string;
  end: string;
}

const WEEKS: Record<Exclude<RangeKey, "all">, number> = { "4w": 4, "3m": 13, "1y": 52 };

/** Whole weeks ending with the current one; "all" starts at the week of your first session. */
export function periodOf(range: RangeKey, today: string, earliest: string | null): Period {
  const monday = mondayOf(today);
  if (range === "all") {
    const fourWeeks = addDays(monday, -7 * (WEEKS["4w"] - 1));
    const first = earliest ? mondayOf(earliest) : fourWeeks;
    return { start: first < fourWeeks ? first : fourWeeks, end: today };
  }
  return { start: addDays(monday, -7 * (WEEKS[range] - 1)), end: today };
}

export function inPeriod(date: string, period: Period): boolean {
  return date >= period.start && date <= period.end;
}

export function daysIn(period: Period): number {
  return Math.round((dateOf(period.end).getTime() - dateOf(period.start).getTime()) / 86_400_000) + 1;
}

/** The same number of days just before (to compare with). */
export function previousPeriod(period: Period): Period {
  return { start: addDays(period.start, -daysIn(period)), end: addDays(period.start, -1) };
}

/** Weeks in the period (at least 1), for weekly averages. */
export function weeksIn(period: Period): number {
  return Math.max(1, daysIn(period) / 7);
}

export interface Bucket {
  /** First day ("2026-10-05" for a week, "2026-10-01" for a month). */
  start: string;
  end: string;
  kind: "week" | "month";
}

/** Longer than this, a chart groups by month (a column per week would be a hairline). */
export const MAX_WEEK_BUCKETS = 26;

function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function nextMonth(iso: string): string {
  const date = dateOf(iso);
  return localDate(new Date(date.getFullYear(), date.getMonth() + 1, 1, 12));
}

/** The columns of a chart over the period: weeks, or months for long periods. */
export function bucketsOf(period: Period): Bucket[] {
  const buckets: Bucket[] = [];
  const weekly = Math.ceil(daysIn(period) / 7) <= MAX_WEEK_BUCKETS;
  if (weekly) {
    for (let start = mondayOf(period.start); start <= period.end; start = addDays(start, 7)) {
      buckets.push({ start, end: addDays(start, 6), kind: "week" });
    }
  } else {
    for (let start = monthStart(period.start); start <= period.end; start = nextMonth(start)) {
      buckets.push({ start, end: addDays(nextMonth(start), -1), kind: "month" });
    }
  }
  return buckets;
}

/** Index of the bucket a day falls in, or -1. */
export function bucketIndex(buckets: readonly Bucket[], date: string): number {
  let low = 0;
  let high = buckets.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const bucket = buckets[mid] as Bucket;
    if (date < bucket.start) high = mid - 1;
    else if (date > bucket.end) low = mid + 1;
    else return mid;
  }
  return -1;
}
