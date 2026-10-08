/**
 * The achievements: each one is a measure (what is counted), an optional filter (which
 * sessions count) and its levels. A new achievement is one more entry here, plus its texts in
 * src/i18n/messages (achievements.items.<key>). See docs/LOGROS.md.
 */
import type { SportKey } from "../sports";

/**
 * What an achievement counts, over your completed sessions:
 * - sessions: sessions; days: distinct days; places: distinct spots; sports: distinct sports;
 * - volume: kilos lifted (work sets); records: personal records;
 * - streak: best run of weeks meeting your weekly target; doubles: days with gym and a sport.
 */
export type Measure = "sessions" | "days" | "places" | "sports" | "volume" | "records" | "streak" | "doubles";

/** Which sessions count. Everything set must match. */
export interface AchievementFilter {
  kind?: "gym" | "sport";
  sport?: SportKey;
  /** Started between 4:00 and this hour (local time): early sessions, not late-night ones. */
  startedBefore?: number;
}

/** Icon names the UI draws (src/features/achievements/badge.tsx). */
export type AchievementIcon =
  | "flag"
  | "dumbbell"
  | "waves"
  | "fist"
  | "flame"
  | "trophy"
  | "weight"
  | "compass"
  | "zap"
  | "sunrise";

export interface Achievement {
  key: string;
  icon: AchievementIcon;
  measure: Measure;
  filter?: AchievementFilter;
  /** What each level asks for, in the measure's unit (kilos for volume), ascending. */
  tiers: readonly number[];
  /** Hidden in the list until you get it. */
  secret?: boolean;
}

export const ACHIEVEMENTS = [
  { key: "first_session", icon: "flag", measure: "sessions", tiers: [1] },
  { key: "iron", icon: "dumbbell", measure: "sessions", filter: { kind: "gym" }, tiers: [10, 50, 100, 250, 500] },
  { key: "the_search", icon: "waves", measure: "places", filter: { sport: "surf" }, tiers: [5, 25, 50, 100] },
  { key: "balboa", icon: "fist", measure: "days", filter: { sport: "boxing" }, tiers: [10, 50, 100, 200] },
  { key: "full_weeks", icon: "flame", measure: "streak", tiers: [4, 12, 26, 52] },
  { key: "records", icon: "trophy", measure: "records", tiers: [1, 10, 50, 100] },
  { key: "tonnes", icon: "weight", measure: "volume", tiers: [10_000, 100_000, 1_000_000] },
  { key: "all_rounder", icon: "compass", measure: "sports", tiers: [3, 5, 8] },
  { key: "double", icon: "zap", measure: "doubles", tiers: [1, 10, 50] },
  { key: "early_bird", icon: "sunrise", measure: "sessions", filter: { startedBefore: 7 }, tiers: [10], secret: true },
] as const satisfies readonly Achievement[];

export type AchievementKey = (typeof ACHIEVEMENTS)[number]["key"];

const BY_KEY = new Map<string, Achievement>(ACHIEVEMENTS.map((achievement) => [achievement.key, achievement]));

/** An achievement by its code (an unlock stored by a newer version may be unknown here). */
export function achievementByKey(key: string): Achievement | undefined {
  return BY_KEY.get(key);
}

/** Medal colours, from the first level up. */
export const TONES = ["bronze", "silver", "gold", "platinum", "diamond"] as const;
export type Tone = (typeof TONES)[number] | "locked";

/** The colour of a level (1-based). A single-level achievement is gold. */
export function tierTone(achievement: Achievement, tier: number): Tone {
  if (tier < 1) return "locked";
  if (achievement.tiers.length === 1) return "gold";
  return TONES[Math.min(tier, TONES.length) - 1] ?? "gold";
}

/** How a measure is shown: volume in tonnes, the rest as counted. */
export function displayValue(achievement: Achievement, value: number): number {
  return achievement.measure === "volume" ? Math.floor(value / 100) / 10 : value;
}

/** Most highlights under the profile. */
export const MAX_FEATURED = 8;
/** Without any chosen, the highlights show the latest ones. */
export const LATEST_HIGHLIGHTS = 5;
