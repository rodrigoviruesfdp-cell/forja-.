import type { LocalDb } from "@/data/local/db";
import type { ProgressSession, ProgressSet } from "@/domain/progress/stats";
import { isWorkSet } from "@/domain/sessions/records";
import type { Session } from "@/domain/schemas";

const alive = <T extends { deleted_at: string | null }>(row: T) => !row.deleted_at;

export interface ProgressData {
  sessions: ProgressSession[];
  sets: ProgressSet[];
}

/** Every completed session, and the work sets of the gym ones (with each exercise's main muscle). */
export async function progressData(db: LocalDb): Promise<ProgressData> {
  const completed = (await db.sessions.where("status").equals("completed").toArray()).filter(alive);
  const gym = new Map(completed.filter((session) => session.kind === "gym").map((session) => [session.id, session]));
  const items = gym.size > 0 ? (await db.session_exercises.where("session_id").anyOf([...gym.keys()]).toArray()).filter(alive) : [];
  const itemById = new Map(items.map((item) => [item.id, item]));
  const rawSets = items.length > 0 ? await db.session_sets.where("session_exercise_id").anyOf([...itemById.keys()]).toArray() : [];
  const exercises = new Map(
    (await db.exercises.bulkGet([...new Set(items.map((item) => item.exercise_id))])).filter((e) => !!e).map((e) => [e.id, e]),
  );

  const sets: ProgressSet[] = [];
  for (const set of rawSets) {
    const item = itemById.get(set.session_exercise_id);
    const session = item ? gym.get(item.session_id) : undefined;
    if (!item || !session || !isWorkSet(set)) continue;
    sets.push({
      id: set.id,
      sessionId: session.id,
      date: session.date,
      completedAt: set.completed_at ?? session.date,
      exerciseId: item.exercise_id,
      muscle: exercises.get(item.exercise_id)?.primary_muscle ?? null,
      weightKg: set.weight_kg,
      reps: set.reps,
      isPr: set.is_pr,
    });
  }

  return {
    sessions: completed.map((session: Session) => ({
      id: session.id,
      date: session.date,
      kind: session.kind,
      sport: session.sport,
      durationMin: session.duration_min,
      rpe: session.rpe,
      distanceKm: session.distance_km,
      metrics: session.metrics ?? {},
    })),
    sets,
  };
}
