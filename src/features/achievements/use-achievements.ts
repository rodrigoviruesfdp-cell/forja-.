"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useFormatter, useTranslations } from "use-intl";
import { achievementStates } from "@/data/repositories/achievements";
import { type Achievement, type AchievementKey, displayValue, tierTone, type Tone } from "@/domain/achievements/catalog";
import { bestTiers, featuredPosition, type Progress, progressOf } from "@/domain/achievements/evaluate";
import type { UserAchievement } from "@/domain/schemas";
import { useUserData } from "@/features/user-data/user-data-context";

/** One achievement as the screens show it. */
export interface AchievementEntry {
  achievement: Achievement;
  /** Your best level of it, if you have one. */
  row: UserAchievement | null;
  progress: Progress;
  tone: Tone;
  /** A level you have not looked at yet (coloured ring). */
  unseen: UserAchievement[];
  featured: boolean;
  /** A secret one you have not got: shown as a question mark. */
  hidden: boolean;
}

export interface AchievementsData {
  entries: AchievementEntry[];
  rows: UserAchievement[];
}

/** Every achievement with your progress, live. Undefined while loading. */
export function useAchievements(): AchievementsData | undefined {
  const { db, user } = useUserData();
  const rows = useLiveQuery(() => db.user_achievements.toArray(), [db]);
  const states = useLiveQuery(() => achievementStates(db, user.id), [db, user.id]);
  if (!rows || !states) return undefined;
  const alive = rows.filter((row) => !row.deleted_at);
  const best = bestTiers(alive);
  const entries = states.map(({ achievement, value }) => {
    const row = best.get(achievement.key) ?? null;
    const progress = progressOf(achievement, value, row?.tier ?? 0);
    return {
      achievement,
      row,
      progress,
      tone: tierTone(achievement, row ? progress.tier : 0),
      unseen: alive.filter((r) => r.achievement_key === achievement.key && !r.seen_at),
      featured: featuredPosition(alive, achievement.key) !== null,
      hidden: !!achievement.secret && !row,
    };
  });
  return { entries, rows: alive };
}

/** Names and phrases of an achievement, in the app's language. */
export function useAchievementText() {
  const t = useTranslations("achievements");
  const format = useFormatter();
  const key = (achievement: Achievement) => achievement.key as AchievementKey;
  return {
    name: (entry: Pick<AchievementEntry, "achievement" | "hidden">) =>
      entry.hidden ? t("secretName") : t(`items.${key(entry.achievement)}.name`),
    description: (entry: Pick<AchievementEntry, "achievement" | "hidden">) =>
      entry.hidden ? t("secretHint") : t(`items.${key(entry.achievement)}.description`),
    /** "50 gym sessions": what a level (or a value) means. */
    goal: (achievement: Achievement, value: number) =>
      t(`items.${key(achievement)}.goal`, { count: displayValue(achievement, value) }),
    /** "146 / 200" in the achievement's unit. */
    fraction: (achievement: Achievement, value: number, next: number) =>
      `${format.number(displayValue(achievement, value))} / ${format.number(displayValue(achievement, next))}`,
    level: (entry: AchievementEntry) =>
      entry.achievement.tiers.length > 1
        ? t("levelOf", { tier: entry.progress.tier, total: entry.achievement.tiers.length })
        : null,
  };
}
