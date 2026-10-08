"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { activeSession, type LastPerformance, lastPerformance, sessionExercises, setsOf } from "@/data/repositories/sessions";
import { orderedSets } from "@/domain/sessions/session";
import type { Exercise, Session, SessionExercise, SessionSet } from "@/domain/schemas";
import { useUserData } from "@/features/user-data/user-data-context";

export interface SessionTree {
  session: Session;
  /** In order. */
  items: SessionExercise[];
  /** Sets of each item, in the order they were done. */
  sets: Map<string, SessionSet[]>;
  catalog: Map<string, Exercise>;
  /** What you did the last time, per exercise (null = first time). */
  lastTime: Map<string, LastPerformance | null>;
}

/** A session with everything in it, live. Undefined while loading, null if missing or deleted. */
export function useSessionTree(id: string | null): SessionTree | null | undefined {
  const { db } = useUserData();
  return useLiveQuery(async () => {
    if (!id) return null;
    const session = await db.sessions.get(id);
    if (!session || session.deleted_at) return null;
    const items = await sessionExercises(db, id);
    const all = await setsOf(db, items.map((item) => item.id));
    const sets = new Map(items.map((item) => [item.id, orderedSets(all.filter((set) => set.session_exercise_id === item.id))]));
    const exerciseIds = [...new Set(items.map((item) => item.exercise_id))];
    const rows = await db.exercises.bulkGet(exerciseIds);
    const catalog = new Map(rows.flatMap((row) => (row ? [[row.id, row] as const] : [])));
    const lastTime = new Map(
      await Promise.all(exerciseIds.map(async (exerciseId) => [exerciseId, await lastPerformance(db, exerciseId, id)] as const)),
    );
    return { session, items, sets, catalog, lastTime };
  }, [db, id]);
}

/** The session in progress, if any. Undefined while loading. */
export function useActiveSession(): Session | null | undefined {
  const { db } = useUserData();
  return useLiveQuery(() => activeSession(db), [db]);
}

/** Sessions of a calendar day (yyyy-mm-dd), oldest first. */
export function useSessionsOn(date: string): Session[] | undefined {
  const { db } = useUserData();
  return useLiveQuery(async () => {
    const rows = await db.sessions.where("date").equals(date).filter((s) => !s.deleted_at).toArray();
    return rows.sort((a, b) => (a.started_at ?? a.created_at).localeCompare(b.started_at ?? b.created_at));
  }, [db, date]);
}

/** Sessions between two days (yyyy-mm-dd, both included). */
export function useSessionsBetween(from: string, to: string): Session[] | undefined {
  const { db } = useUserData();
  return useLiveQuery(
    () => db.sessions.where("date").between(from, to, true, true).filter((s) => !s.deleted_at).toArray(),
    [db, from, to],
  );
}

/** Every session's day and status (for the streak). */
export function useSessionDays(): Pick<Session, "date" | "status" | "deleted_at">[] | undefined {
  const { db } = useUserData();
  return useLiveQuery(
    async () => (await db.sessions.toArray()).map(({ date, status, deleted_at }) => ({ date, status, deleted_at })),
    [db],
  );
}
