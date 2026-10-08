/**
 * What goes on the images to share (Instagram stories): which numbers a session shows and
 * how things fit. The drawing itself happens on the phone (src/features/share): the photo
 * never leaves it.
 */
import type { Session } from "./schemas";
import type { SessionSummary } from "./sessions/session";
import { METRIC_KEYS, type MetricKey } from "./sports";

/** Instagram story size. */
export const STORY = { width: 1080, height: 1920 } as const;
/** Transparent sticker to paste over your own story photo. */
export const STICKER = { width: 1080, height: 720 } as const;

export const MAX_STATS = 3;

export type ShareStatKey = "duration" | "volume" | "sets" | "distance" | "effort" | MetricKey;

export interface ShareStat {
  key: ShareStatKey;
  value: number;
}

/**
 * Up to three numbers, most telling first. Gym: duration, volume, sets. Sport: duration,
 * what the sport counts (waves, rounds…), distance, effort. Zeros are never shown.
 */
export function shareStats(session: Session, summary: SessionSummary | null): ShareStat[] {
  const stats: ShareStat[] = [];
  const add = (key: ShareStatKey, value: number | null | undefined) => {
    if (value && value > 0) stats.push({ key, value });
  };
  if (session.kind === "gym") {
    add("duration", summary?.durationMin ?? session.duration_min);
    add("volume", summary?.volumeKg);
    add("sets", summary?.workSets);
  } else {
    add("duration", session.duration_min);
    for (const key of METRIC_KEYS) add(key, session.metrics?.[key]);
    add("distance", session.distance_km);
    add("effort", session.rpe);
  }
  return stats.slice(0, MAX_STATS);
}

/** The part of a photo that fills a box without stretching (centred, like `object-fit: cover`). */
export function coverCrop(
  srcWidth: number,
  srcHeight: number,
  boxWidth: number,
  boxHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(boxWidth / srcWidth, boxHeight / srcHeight);
  const sw = boxWidth / scale;
  const sh = boxHeight / scale;
  return { sx: (srcWidth - sw) / 2, sy: (srcHeight - sh) / 2, sw, sh };
}

/**
 * Routine card: how many days fit and how many lines of exercises each day gets. Every day
 * takes `dayHeight` (its name and the gap after it) and each line of exercises `lineHeight`;
 * when not even the names fit, the last line says how many days are left out.
 */
export function routineLayout(
  exerciseCounts: readonly number[],
  available: number,
  dayHeight: number,
  lineHeight: number,
  maxLines = 3,
): { days: number; lines: number } {
  const total = exerciseCounts.length;
  if (total * dayHeight > available) {
    return { days: Math.max(1, Math.floor((available - lineHeight) / dayHeight)), lines: 0 };
  }
  const withExercises = exerciseCounts.filter((count) => count > 0).length;
  if (withExercises === 0) return { days: total, lines: 0 };
  const lines = Math.floor((available - total * dayHeight) / (withExercises * lineHeight));
  return { days: total, lines: Math.max(0, Math.min(maxLines, lines)) };
}
