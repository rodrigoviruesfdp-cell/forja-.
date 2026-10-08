/**
 * Achievements from your history: what each one stands at and, for every level reached, the
 * session that reached it. Everything is recomputed from the sessions (no running counters
 * that could drift when an old session is edited or deleted); storing an unlock is the
 * repository's job, and a stored unlock is never taken back.
 */
import { addDays, dateOf, mondayOf } from "../dates";
import { canonicalSport } from "../sports";
import { type Achievement, type AchievementFilter, ACHIEVEMENTS, LATEST_HIGHLIGHTS, MAX_FEATURED } from "./catalog";
import type { UserAchievement } from "../schemas";

/** A completed session, with what the achievements need from it. */
export interface AchievementSession {
  id: string;
  date: string;
  kind: "gym" | "sport";
  sport: string | null;
  placeId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  /** Kilos lifted in work sets (gym). */
  volumeKg: number;
  /** Personal records set in it (gym). */
  records: number;
}

export interface Unlock {
  key: string;
  /** 1-based level. */
  tier: number;
  sessionId: string;
  /** When: the end of the session that reached it (or its day, for one logged afterwards). */
  at: string;
}

export interface AchievementState {
  achievement: Achievement;
  value: number;
  /** Levels reached, in order. */
  unlocks: Unlock[];
}

export interface EvaluateOptions {
  /** Sessions a week that keep the streak (see src/domain/streak.ts). */
  weeklyTarget: number;
}

const EARLIEST_HOUR = 4;

/** Chronological order: by day, then by when it happened. */
function moment(session: AchievementSession): string {
  return `${session.date}|${session.startedAt ?? session.endedAt ?? session.createdAt}`;
}

/** When a session counts as done (local noon of its day if it has no times). */
export function sessionMoment(session: Pick<AchievementSession, "date" | "startedAt" | "endedAt">): string {
  return session.endedAt ?? session.startedAt ?? dateOf(session.date).toISOString();
}

function matches(filter: AchievementFilter | undefined, session: AchievementSession): boolean {
  if (!filter) return true;
  if (filter.kind && session.kind !== filter.kind) return false;
  if (filter.sport && (session.kind !== "sport" || canonicalSport(session.sport ?? "") !== filter.sport)) return false;
  if (filter.startedBefore !== undefined) {
    if (!session.startedAt) return false;
    const hour = new Date(session.startedAt).getHours();
    if (hour < EARLIEST_HOUR || hour >= filter.startedBefore) return false;
  }
  return true;
}

/** Keeps a measure's running value as sessions come in, oldest first. */
function counter(achievement: Achievement, options: EvaluateOptions): (session: AchievementSession) => number {
  let total = 0;
  const seen = new Set<string>();
  switch (achievement.measure) {
    case "sessions":
      return () => (total += 1);
    case "days":
      return (session) => (seen.add(session.date), seen.size);
    case "places":
      return (session) => {
        if (session.placeId) seen.add(session.placeId);
        return seen.size;
      };
    case "sports":
      return (session) => {
        if (session.kind === "sport" && session.sport) seen.add(canonicalSport(session.sport).toLocaleLowerCase());
        return seen.size;
      };
    case "volume":
      return (session) => (total += session.volumeKg);
    case "records":
      return (session) => (total += session.records);
    case "doubles": {
      const kinds = new Map<string, Set<string>>();
      return (session) => {
        const day = kinds.get(session.date) ?? new Set<string>();
        day.add(session.kind);
        kinds.set(session.date, day);
        if (day.size === 2) seen.add(session.date);
        return seen.size;
      };
    }
    case "streak": {
      // Sessions arrive by day, so a week is complete before a later one starts.
      const perWeek = new Map<string, number>();
      const run = new Map<string, number>();
      return (session) => {
        const week = mondayOf(session.date);
        const done = (perWeek.get(week) ?? 0) + 1;
        perWeek.set(week, done);
        if (done === options.weeklyTarget) {
          const length = (run.get(addDays(week, -7)) ?? 0) + 1;
          run.set(week, length);
          total = Math.max(total, length);
        }
        return total;
      };
    }
  }
}

/** Where every achievement stands after these sessions, and which session reached each level. */
export function evaluateAchievements(
  sessions: readonly AchievementSession[],
  options: EvaluateOptions,
  catalog: readonly Achievement[] = ACHIEVEMENTS,
): AchievementState[] {
  const ordered = [...sessions].sort((a, b) => moment(a).localeCompare(moment(b)));
  return catalog.map((achievement) => {
    const count = counter(achievement, options);
    const unlocks: Unlock[] = [];
    let value = 0;
    for (const session of ordered) {
      if (!matches(achievement.filter, session)) continue;
      value = count(session);
      while (unlocks.length < achievement.tiers.length && value >= (achievement.tiers[unlocks.length] ?? Infinity)) {
        unlocks.push({ key: achievement.key, tier: unlocks.length + 1, sessionId: session.id, at: sessionMoment(session) });
      }
    }
    return { achievement, value, unlocks };
  });
}

/** Levels reached that are not stored yet. */
export function newUnlocks(states: readonly AchievementState[], stored: readonly Pick<UserAchievement, "achievement_key" | "tier">[]): Unlock[] {
  const have = new Set(stored.map((row) => `${row.achievement_key}:${row.tier}`));
  return states.flatMap((state) => state.unlocks.filter((unlock) => !have.has(`${unlock.key}:${unlock.tier}`)));
}

export interface Progress {
  /** Highest level you have (0 = none). Stored unlocks count even if the sessions are gone. */
  tier: number;
  value: number;
  /** What the next level asks for, or null at the top. */
  next: number | null;
  /** 0–1 towards the next level (1 at the top). */
  fraction: number;
}

export function progressOf(achievement: Achievement, value: number, storedTier = 0): Progress {
  const reached = achievement.tiers.filter((threshold) => value >= threshold).length;
  const tier = Math.max(reached, storedTier);
  const next = achievement.tiers[tier] ?? null;
  return { tier, value, next, fraction: next === null ? 1 : Math.min(1, value / next) };
}

/** The best stored level of each achievement. */
export function bestTiers(rows: readonly UserAchievement[]): Map<string, UserAchievement> {
  const best = new Map<string, UserAchievement>();
  for (const row of rows) {
    if (row.deleted_at) continue;
    const current = best.get(row.achievement_key);
    if (!current || row.tier > current.tier) best.set(row.achievement_key, row);
  }
  return best;
}

/** An achievement is featured while any of its levels has a position (the lowest wins). */
export function featuredPosition(rows: readonly UserAchievement[], key: string): number | null {
  const positions = rows
    .filter((row) => row.achievement_key === key && !row.deleted_at && row.featured_position !== null)
    .map((row) => row.featured_position as number);
  return positions.length > 0 ? Math.min(...positions) : null;
}

/**
 * The highlights under the profile: the ones you chose, in order; without any, the latest
 * you unlocked. Returns achievement keys.
 */
export function highlights(rows: readonly UserAchievement[]): string[] {
  const best = bestTiers(rows);
  const featured = featuredKeys(rows);
  if (featured.length > 0) return featured.slice(0, MAX_FEATURED);
  return [...best.values()]
    .sort((a, b) => b.unlocked_at.localeCompare(a.unlocked_at))
    .slice(0, LATEST_HIGHLIGHTS)
    .map((row) => row.achievement_key);
}

/** Featured achievement keys, in order. */
function featuredKeys(rows: readonly UserAchievement[]): string[] {
  return [...new Set(rows.filter((row) => !row.deleted_at).map((row) => row.achievement_key))]
    .map((key) => ({ key, position: featuredPosition(rows, key) }))
    .filter((item): item is { key: string; position: number } => item.position !== null)
    .sort((a, b) => a.position - b.position)
    .map((item) => item.key);
}

/**
 * Pins `key` at the end of the highlights, or unpins it. Positions are renumbered 0, 1, 2…
 * Returns only the rows that change.
 */
export function toggleFeatured(rows: readonly UserAchievement[], key: string): UserAchievement[] {
  const alive = rows.filter((row) => !row.deleted_at);
  const current = featuredKeys(alive);
  const pinning = !current.includes(key);
  const best = bestTiers(alive).get(key);
  if (pinning && !best) return [];
  const order = pinning ? [...current, key] : current.filter((k) => k !== key);
  const changed: UserAchievement[] = [];
  for (const row of alive) {
    const index = order.indexOf(row.achievement_key);
    const holds = row.featured_position !== null || (pinning && row.id === best?.id);
    const wanted = index >= 0 && holds ? index : null;
    if (wanted !== row.featured_position) changed.push({ ...row, featured_position: wanted });
  }
  return changed;
}

/** How many achievements are featured. */
export function featuredCount(rows: readonly UserAchievement[]): number {
  return featuredKeys(rows).length;
}
