import type { LocalDb } from "@/data/local/db";
import { saveChanges } from "@/data/local/mutations";
import { type AchievementSession, evaluateAchievements, newUnlocks, toggleFeatured } from "@/domain/achievements/evaluate";
import { isWorkSet } from "@/domain/sessions/records";
import type { Session, UserAchievement } from "@/domain/schemas";
import { weeklyTarget } from "@/domain/streak";

const alive = <T extends { deleted_at: string | null }>(row: T) => !row.deleted_at;

/** Every completed session, with the kilos and records of the gym ones. */
export async function achievementSessions(db: LocalDb): Promise<AchievementSession[]> {
  const sessions = (await db.sessions.where("status").equals("completed").toArray()).filter(alive);
  const gym = sessions.filter((session) => session.kind === "gym").map((session) => session.id);
  const items = gym.length > 0 ? (await db.session_exercises.where("session_id").anyOf(gym).toArray()).filter(alive) : [];
  const sessionOf = new Map(items.map((item) => [item.id, item.session_id]));
  const sets = items.length > 0 ? await db.session_sets.where("session_exercise_id").anyOf([...sessionOf.keys()]).toArray() : [];

  const volume = new Map<string, number>();
  const records = new Map<string, number>();
  for (const set of sets) {
    const sessionId = sessionOf.get(set.session_exercise_id);
    if (!sessionId || !isWorkSet(set)) continue;
    volume.set(sessionId, (volume.get(sessionId) ?? 0) + set.weight_kg * set.reps);
    if (set.is_pr) records.set(sessionId, (records.get(sessionId) ?? 0) + 1);
  }
  return sessions.map((session: Session) => ({
    id: session.id,
    date: session.date,
    kind: session.kind,
    sport: session.sport,
    placeId: session.place_id,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    createdAt: session.created_at,
    volumeKg: volume.get(session.id) ?? 0,
    records: records.get(session.id) ?? 0,
  }));
}

/** The streak target of the active routine (as on the calendar). */
async function currentWeeklyTarget(db: LocalDb, userId: string): Promise<number> {
  const profile = await db.profiles.get(userId);
  const routine = profile?.active_routine_id ? await db.routines.get(profile.active_routine_id) : undefined;
  if (!routine || routine.deleted_at) return weeklyTarget(null, []);
  const days = (await db.routine_days.where("routine_id").equals(routine.id).toArray()).filter(alive);
  return weeklyTarget(routine, days);
}

/** Where every achievement stands now (for the list and the progress bars). */
export async function achievementStates(db: LocalDb, userId: string) {
  const [sessions, target] = await Promise.all([achievementSessions(db), currentWeeklyTarget(db, userId)]);
  return evaluateAchievements(sessions, { weeklyTarget: target });
}

/**
 * The same id for the same level of the same achievement on every phone (a hash of the three),
 * so computing an unlock twice, here or elsewhere, always lands on one row.
 */
export async function achievementRowId(userId: string, key: string, tier: number): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${userId}:${key}:${tier}`)));
  const bytes = digest.slice(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80; // version 8: custom
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // RFC variant
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Looks at your history and stores the levels you reached and did not have yet (unseen).
 * Run after finishing or saving a session, and in the background when the app opens.
 * Returns the new unlocks, oldest first.
 */
export async function checkAchievements(db: LocalDb, userId: string): Promise<UserAchievement[]> {
  const [states, stored] = await Promise.all([achievementStates(db, userId), db.user_achievements.toArray()]);
  const fresh = newUnlocks(states, stored);
  if (fresh.length === 0) return [];
  const now = new Date().toISOString();
  const rows: UserAchievement[] = await Promise.all(
    fresh.map(async (unlock) => ({
      id: await achievementRowId(userId, unlock.key, unlock.tier),
      user_id: userId,
      achievement_key: unlock.key,
      tier: unlock.tier,
      unlocked_at: unlock.at,
      session_id: unlock.sessionId,
      seen_at: null,
      featured_position: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })),
  );
  rows.sort((a, b) => a.unlocked_at.localeCompare(b.unlocked_at));
  await saveChanges(db, { user_achievements: rows });
  return rows;
}

/** Marks unlocks as seen: the animation and the coloured ring do not show again (on any phone). */
export async function markAchievementsSeen(db: LocalDb, rows: readonly UserAchievement[]): Promise<void> {
  const now = new Date().toISOString();
  const unseen = rows.filter((row) => !row.seen_at);
  if (unseen.length === 0) return;
  // Re-read them: the row on screen may be older than the one stored.
  const current = (await db.user_achievements.bulkGet(unseen.map((row) => row.id))).filter((row): row is UserAchievement => !!row && !row.seen_at);
  await saveChanges(db, { user_achievements: current.map((row) => ({ ...row, seen_at: now })) });
}

/** Adds an achievement to the highlights under the profile, or takes it out. */
export async function toggleFeaturedAchievement(db: LocalDb, key: string): Promise<void> {
  const changes = toggleFeatured(await db.user_achievements.toArray(), key);
  await saveChanges(db, { user_achievements: changes });
}
