/**
 * Sample history to try the app without weeks of training ("Probar con datos de ejemplo"):
 * twelve weeks of the A/B/C/D + football template with double progression, a couple of
 * surf spots, runs every other Sunday and a weekly weigh-in. Pure and seeded: the same input
 * gives the same rows. It is written to a separate local database, never to your account
 * (see src/data/demo).
 */
import { addDays, dateOf, mondayOf, weekdayOfIso } from "../dates";
import { newPlace } from "../places";
import { type Clock, rotationOrder } from "../routines/builder";
import { instantiateTemplate, TEMPLATES, type TemplateNames } from "../routines/templates";
import type {
  BodyMetric,
  Place,
  Routine,
  RoutineDay,
  RoutineExercise,
  Session,
  SessionExercise,
  SessionSet,
} from "../schemas";
import { findRecords, type HistorySet } from "../sessions/records";
import { finishSession, newSet, startSession } from "../sessions/session";
import { newSportSession, skipDay } from "../sessions/sport-session";
import type { SportKey } from "../sports";
import { roundTo, toKg, type WeightUnit } from "../units";

export const SAMPLE_WEEKS = 12;
/** Surf spots of the sample (proper names: the same in every language). */
export const SAMPLE_SPOTS = ["Zurriola", "Sopelana"] as const;

export interface SampleInput {
  userId: string;
  /** yyyy-mm-dd, local: the history ends yesterday, so today's plan is still to do. */
  today: string;
  /** Catalog id of each free-exercise-db id on this phone. */
  exerciseIdBySource: ReadonlyMap<string, string>;
  /** Routine and day names, in your language. */
  names: TemplateNames;
  sportName: (sport: SportKey) => string;
  /** Loads are round numbers in the unit you read (stored in kg, as always). */
  unit: WeightUnit;
  newId: () => string;
  weeks?: number;
  seed?: number;
}

/** Rows by table, ready to store. */
export interface SampleData {
  routines: Routine[];
  routine_days: RoutineDay[];
  routine_exercises: RoutineExercise[];
  places: Place[];
  sessions: Session[];
  session_exercises: SessionExercise[];
  session_sets: SessionSet[];
  body_metrics: BodyMetric[];
}

/** Starting load (kg; 0 = bodyweight) and the jump when every set reaches the top of the range. */
const LIFTS: Record<string, { kg: number; stepKg: number }> = {
  "Barbell_Bench_Press_-_Medium_Grip": { kg: 70, stepKg: 2.5 },
  Incline_Dumbbell_Press: { kg: 24, stepKg: 2 },
  Cable_Crossover: { kg: 15, stepKg: 2.5 },
  Triceps_Pushdown: { kg: 25, stepKg: 2.5 },
  "Dips_-_Triceps_Version": { kg: 0, stepKg: 0 },
  Pullups: { kg: 0, stepKg: 0 },
  Bent_Over_Barbell_Row: { kg: 60, stepKg: 2.5 },
  Seated_Cable_Rows: { kg: 55, stepKg: 2.5 },
  Barbell_Curl: { kg: 30, stepKg: 2.5 },
  Hammer_Curls: { kg: 14, stepKg: 2 },
  Barbell_Squat: { kg: 90, stepKg: 2.5 },
  Romanian_Deadlift: { kg: 80, stepKg: 2.5 },
  Leg_Press: { kg: 160, stepKg: 10 },
  Lying_Leg_Curls: { kg: 40, stepKg: 2.5 },
  Standing_Calf_Raises: { kg: 60, stepKg: 5 },
  Standing_Military_Press: { kg: 45, stepKg: 2.5 },
  Side_Lateral_Raise: { kg: 9, stepKg: 1 },
  Face_Pull: { kg: 20, stepKg: 2.5 },
  Hanging_Leg_Raise: { kg: 0, stepKg: 0 },
  Cable_Crunch: { kg: 40, stepKg: 5 },
};
const DEFAULT_LIFT = { kg: 20, stepKg: 2.5 };

/** Small, fast, seeded generator (mulberry32): the sample is the same every time. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A moment of a local day, `minutes` after midnight. */
function at(date: string, minutes: number): string {
  const day = dateOf(date);
  day.setHours(0, minutes, 0, 0);
  return day.toISOString();
}

function plusMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

/** Loads in the unit you read: kg as they are, pounds rounded to plates of 5 lb. */
function inUnit(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : Math.round(kg / 0.45359237 / 5) * 5;
}

interface Progress {
  /** In `unit`. */
  load: number;
  step: number;
  reps: number;
}

export function buildSampleData(input: SampleInput): SampleData {
  const random = seeded(input.seed ?? 20261010);
  const pick = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const chance = (p: number) => random() < p;
  const weeks = input.weeks ?? SAMPLE_WEEKS;
  const first = mondayOf(addDays(input.today, -7 * weeks));
  const clockAt = (now: string): Clock => ({ now, newId: input.newId });

  const { routine, days, exercises: routineExercises } = instantiateTemplate(
    TEMPLATES.abcdSport,
    input.userId,
    input.names,
    input.exerciseIdBySource,
    clockAt(at(first, 9 * 60)),
  );
  const rotation = rotationOrder(days);
  const football = days.find((day) => day.kind === "sport");
  const sourceOf = new Map([...input.exerciseIdBySource].map(([source, id]) => [id, source]));

  const data: SampleData = {
    routines: [routine],
    routine_days: days,
    routine_exercises: routineExercises,
    places: SAMPLE_SPOTS.map((name) => newPlace(input.userId, name, "surf", clockAt(at(first, 9 * 60)))),
    sessions: [],
    session_exercises: [],
    session_sets: [],
    body_metrics: [],
  };

  const progress = new Map<string, Progress>();
  const progressOf = (item: RoutineExercise): Progress => {
    let state = progress.get(item.exercise_id);
    if (!state) {
      const lift = LIFTS[sourceOf.get(item.exercise_id) ?? ""] ?? DEFAULT_LIFT;
      const step = lift.stepKg === 0 ? 0 : input.unit === "kg" ? lift.stepKg : Math.max(5, inUnit(lift.stepKg, "lb"));
      state = { load: inUnit(lift.kg, input.unit), step, reps: item.target_reps_min };
      progress.set(item.exercise_id, state);
    }
    return state;
  };

  const gymSession = (date: string, day: RoutineDay) => {
    const startedAt = at(date, 18 * 60 + pick(0, 75));
    const items = routineExercises.filter((item) => item.routine_day_id === day.id);
    const { session, exercises } = startSession({ userId: input.userId, day, items, title: day.name }, clockAt(startedAt));
    const badDay = chance(0.1);
    let clock = plusMinutes(startedAt, 5);
    const sets: SessionSet[] = [];
    exercises.forEach((item, index) => {
      const target = items.find((routineItem) => routineItem.id === item.routine_exercise_id);
      if (!target) return;
      const state = progressOf(target);
      const top = target.target_reps_max ?? target.target_reps_min;
      const own: SessionSet[] = [];
      const log = (load: number, reps: number, isWarmup: boolean) => {
        clock = plusMinutes(clock, 2 + random() * 1.5);
        own.push(newSet(item, own, { weightKg: toKg(load, input.unit), reps, isWarmup }, clockAt(clock)));
      };
      // A warm-up before the first heavy lift of the day.
      if (index === 0 && state.load > 0) log(Math.round(state.load / 2 / (state.step || 1)) * (state.step || 1), 10, true);
      const planned = target.target_sets;
      let reachedTop = true;
      for (let n = 1; n <= planned; n += 1) {
        const tired = n === planned && chance(0.35);
        const reps = Math.max(1, state.reps - (tired ? 1 : 0) - (badDay ? 1 : 0));
        if (reps < top) reachedTop = false;
        log(state.load, reps, false);
      }
      sets.push(...own);
      clock = plusMinutes(clock, 1);
      // Double progression: more reps each time, then more load and back to the bottom of the range.
      if (badDay) return;
      if (state.step === 0) {
        if (state.reps < top + 4 && chance(0.45)) state.reps += 1;
      } else if (reachedTop) {
        state.load += state.step;
        state.reps = target.target_reps_min;
      } else if (chance(0.75)) {
        state.reps = Math.min(top, state.reps + 1);
      }
    });
    const rpe = chance(0.12) ? null : pick(6, 9);
    const done = finishSession(session, sets, { rpe, notes: null }, plusMinutes(clock, 3));
    data.sessions.push(done);
    data.session_exercises.push(...exercises.filter((item) => sets.some((set) => set.session_exercise_id === item.id)));
    data.session_sets.push(...sets);
  };

  const sport = (date: string, fields: { sport: SportKey; minutes: number; rpe: number; distanceKm?: number; placeId?: string; metrics?: Record<string, number>; day?: RoutineDay }) => {
    data.sessions.push(
      newSportSession(
        input.userId,
        {
          sport: fields.sport,
          date,
          durationMin: fields.minutes,
          rpe: fields.rpe,
          distanceKm: fields.distanceKm ?? null,
          placeId: fields.placeId ?? null,
          metrics: fields.metrics ?? {},
          notes: null,
          routineDayId: fields.day?.id ?? null,
          title: fields.day?.name ?? input.sportName(fields.sport),
        },
        clockAt(at(date, 20 * 60)),
      ),
    );
  };

  // Last week and this one are complete: the streak is alive when you open the sample.
  const recentFrom = addDays(mondayOf(input.today), -7);
  let next = 0;
  for (let date = first, week = 0; date < input.today; date = addDays(date, 1)) {
    const weekday = weekdayOfIso(date);
    if (weekday === 0 && date !== first) week += 1;
    const recent = date >= recentFrom;

    if (weekday === 0) {
      const kg = 82.6 - 0.22 * week + (random() - 0.5) * 0.7;
      data.body_metrics.push({
        id: input.newId(),
        user_id: input.userId,
        date,
        body_weight_kg: roundTo(kg, 1),
        notes: null,
        created_at: at(date, 8 * 60),
        updated_at: at(date, 8 * 60),
        deleted_at: null,
      });
    }

    const day = rotation[next % rotation.length];
    if (day && routine.training_weekdays.includes(weekday)) {
      const roll = random();
      if (recent || roll < 0.88) {
        gymSession(date, day);
        next += 1;
      } else if (roll < 0.94) {
        // Skipped: in a rotation the day stays the next one to do.
        data.sessions.push(skipDay(input.userId, day, date, clockAt(at(date, 21 * 60))));
      }
    }
    if (football && weekday === football.weekday && (recent || chance(0.85))) {
      sport(date, { sport: "football", minutes: pick(4, 6) * 15, rpe: pick(7, 9), day: football });
    }
    if (weekday === 5 && (recent || chance(0.7))) {
      const place = data.places[chance(0.75) ? 0 : 1];
      sport(date, { sport: "surf", minutes: pick(6, 10) * 15, rpe: pick(5, 7), placeId: place?.id, metrics: { waves: pick(6, 20) } });
    }
    if (weekday === 6 && week % 2 === 0 && chance(0.8)) {
      const km = roundTo(6 + random() * 6, 1);
      sport(date, { sport: "running", minutes: Math.round(km * (5.2 + random() * 0.6)), rpe: pick(6, 8), distanceKm: km });
    }
  }

  markRecords(data);
  return data;
}

/** The record flags of the whole history, as the app keeps them. */
function markRecords(data: SampleData): void {
  const itemById = new Map(data.session_exercises.map((item) => [item.id, item]));
  const history = new Map<string, HistorySet[]>();
  for (const set of data.session_sets) {
    const item = itemById.get(set.session_exercise_id);
    if (!item) continue;
    history.set(item.exercise_id, [...(history.get(item.exercise_id) ?? []), { set, sessionId: item.session_id }]);
  }
  const records = new Set([...history.values()].flatMap((sets) => [...findRecords(sets).keys()]));
  data.session_sets = data.session_sets.map((set) => (records.has(set.id) ? { ...set, is_pr: true } : set));
}
