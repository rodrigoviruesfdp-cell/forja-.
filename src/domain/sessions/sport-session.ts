/**
 * Sports logged by hand (also on past days): what, when, how long, how hard, where and what
 * the sport counts. And "skipped" days, so the calendar can tell a rest day from a missed one.
 */
import { isIsoDate } from "../dates";
import { type Clock, cleanName, LIMITS } from "../routines/builder";
import type { RoutineDay, Session } from "../schemas";
import { canonicalSport, cleanMetrics, sportProfile } from "../sports";
import { roundTo } from "../units";

export const SPORT_LIMITS = {
  durationMin: 1440,
  distanceKm: 99999.99,
  notes: 2000,
  title: 80,
} as const;

export interface SportInput {
  /** A sport code or the name of one that is not in the list. */
  sport: string;
  /** yyyy-mm-dd: today or a past day. */
  date: string;
  durationMin: number | null;
  rpe: number | null;
  distanceKm: number | null;
  placeId: string | null;
  metrics: Readonly<Record<string, unknown>>;
  notes: string | null;
  /** The routine day it fulfils (a planned sport), if any. */
  routineDayId: string | null;
  /** The name kept in the history: the routine day's, or the sport's in your language. */
  title: string;
}

function cleanNumber(value: number | null, max: number, decimals: number): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(max, roundTo(value, decimals));
}

function sportFields(input: SportInput) {
  const sport = canonicalSport(cleanName(input.sport, LIMITS.sport, input.title)) || input.title;
  if (!isIsoDate(input.date)) throw new Error(`Invalid date: ${input.date}`);
  const notes = input.notes?.trim().slice(0, SPORT_LIMITS.notes) || null;
  return {
    date: input.date,
    sport,
    title: cleanName(input.title, SPORT_LIMITS.title, sport),
    routine_day_id: input.routineDayId,
    duration_min: cleanNumber(input.durationMin, SPORT_LIMITS.durationMin, 0),
    rpe: input.rpe === null ? null : Math.min(10, Math.max(1, Math.round(input.rpe))),
    distance_km: sportProfile(sport).distance ? cleanNumber(input.distanceKm, SPORT_LIMITS.distanceKm, 2) : null,
    place_id: input.placeId,
    metrics: cleanMetrics(sport, input.metrics),
    notes,
  };
}

/** A sport session you did (logged now or for a past day). */
export function newSportSession(userId: string, input: SportInput, clock: Clock): Session {
  return {
    id: clock.newId(),
    user_id: userId,
    kind: "sport",
    status: "completed",
    visibility: "private",
    // A sport logged afterwards has no reliable start time; the day is what counts.
    started_at: null,
    ended_at: null,
    ...sportFields(input),
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
}

export function editSportSession(session: Session, input: SportInput): Session {
  return { ...session, ...sportFields(input) };
}

/**
 * "Skip" a planned day: a skipped session for that date. In a rotation the day is not used
 * up: it stays the next one to do.
 */
export function skipDay(userId: string, day: RoutineDay, date: string, clock: Clock): Session {
  if (!isIsoDate(date)) throw new Error(`Invalid date: ${date}`);
  return {
    id: clock.newId(),
    user_id: userId,
    date,
    kind: day.kind,
    routine_day_id: day.id,
    title: cleanName(day.name, SPORT_LIMITS.title, "—"),
    sport: day.kind === "sport" ? day.sport : null,
    duration_min: null,
    rpe: null,
    distance_km: null,
    notes: null,
    status: "skipped",
    visibility: "private",
    started_at: null,
    ended_at: null,
    place_id: null,
    metrics: {},
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
}
