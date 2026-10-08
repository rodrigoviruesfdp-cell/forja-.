/**
 * Personal records (PR) of an exercise. A work set (not a warm-up) is a record when it beats
 * every earlier work set of that exercise in at least one of:
 *   - weight: a heavier weight;
 *   - e1rm: a higher estimated one-rep max (Epley, up to 12 reps);
 *   - reps: more reps, for exercises done without added weight (pull-ups, dips…).
 * A record needs something to beat: an earlier session with that exercise. The first time
 * you do an exercise sets the baseline and is never a record.
 *
 * `session_sets.is_pr` caches the result; it is recomputed whenever a set of the exercise
 * is added, edited or deleted, because that can change later sets too.
 */
import type { SessionSet } from "../schemas";
import { estimateOneRepMax } from "./one-rep-max";

export type RecordKind = "weight" | "e1rm" | "reps";

/** A logged set and the session it belongs to (records compare across sessions). */
export interface HistorySet {
  set: SessionSet;
  sessionId: string;
}

interface Bests {
  weightKg: number;
  e1rm: number;
  bodyweightReps: number;
}

// Weights have 3 decimals; anything below this is the same weight.
const EPSILON = 1e-6;

export function isWorkSet(set: SessionSet): boolean {
  return !set.deleted_at && !set.is_warmup && set.completed_at !== null && set.reps >= 1;
}

function recordKinds(set: SessionSet, bests: Bests): RecordKind[] {
  const kinds: RecordKind[] = [];
  if (set.weight_kg > 0 && set.weight_kg > bests.weightKg + EPSILON) kinds.push("weight");
  const e1rm = estimateOneRepMax(set.weight_kg, set.reps);
  if (e1rm !== null && e1rm > bests.e1rm + EPSILON) kinds.push("e1rm");
  if (set.weight_kg === 0 && set.reps > bests.bodyweightReps) kinds.push("reps");
  return kinds;
}

function improve(bests: Bests, set: SessionSet): Bests {
  return {
    weightKg: Math.max(bests.weightKg, set.weight_kg),
    e1rm: Math.max(bests.e1rm, estimateOneRepMax(set.weight_kg, set.reps) ?? 0),
    bodyweightReps: set.weight_kg === 0 ? Math.max(bests.bodyweightReps, set.reps) : bests.bodyweightReps,
  };
}

function chronological(a: HistorySet, b: HistorySet): number {
  return (
    (a.set.completed_at ?? "").localeCompare(b.set.completed_at ?? "") ||
    a.set.set_number - b.set.set_number ||
    a.set.id.localeCompare(b.set.id)
  );
}

/** The record sets of one exercise (every session of it), with what each one beat. */
export function findRecords(history: readonly HistorySet[]): Map<string, RecordKind[]> {
  const records = new Map<string, RecordKind[]>();
  let bests: Bests = { weightKg: 0, e1rm: 0, bodyweightReps: 0 };
  const sessionsSeen = new Set<string>();
  for (const item of history.filter((h) => isWorkSet(h.set)).sort(chronological)) {
    const hasBaseline = [...sessionsSeen].some((id) => id !== item.sessionId);
    if (hasBaseline) {
      const kinds = recordKinds(item.set, bests);
      if (kinds.length > 0) records.set(item.set.id, kinds);
    }
    bests = improve(bests, item.set);
    sessionsSeen.add(item.sessionId);
  }
  return records;
}

/** Sets whose cached `is_pr` no longer matches their history, ready to save. */
export function staleRecordFlags(history: readonly HistorySet[]): SessionSet[] {
  const records = findRecords(history);
  return history.flatMap(({ set }) => {
    if (set.deleted_at) return [];
    const isPr = records.has(set.id);
    return set.is_pr === isPr ? [] : [{ ...set, is_pr: isPr }];
  });
}
