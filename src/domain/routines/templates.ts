/**
 * Ready-made routines to start from. Exercises are referenced by their free-exercise-db id
 * (source_id), which is stable; names come from the app's translations.
 */
import type { Routine, RoutineDay, RoutineExercise } from "../schemas";
import {
  type Clock,
  type DayKind,
  newDay,
  newRoutine,
  newRoutineExercise,
  type ScheduleType,
  type Weekday,
  WEEKDAYS,
} from "./builder";
import type { WeekStripDay } from "./plan";

export const TEMPLATE_KEYS = ["abcdSport", "fullBody3"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

interface TemplateExercise {
  sourceId: string;
  sets: number;
  repsMin: number;
  repsMax: number | null;
}

interface TemplateDay {
  /** Translation key under routines.templates.days (gym), or the sport code (sport). */
  key: string;
  kind: DayKind;
  weekday?: Weekday;
  exercises?: TemplateExercise[];
}

export interface RoutineTemplate {
  key: TemplateKey;
  scheduleType: ScheduleType;
  trainingWeekdays: Weekday[];
  days: TemplateDay[];
}

const ex = (sourceId: string, sets: number, repsMin: number, repsMax: number | null = null): TemplateExercise => ({
  sourceId,
  sets,
  repsMin,
  repsMax,
});

export const TEMPLATES: Record<TemplateKey, RoutineTemplate> = {
  // Four gym days in rotation (Mon, Tue, Thu, Fri) and a sport pinned to Wednesday.
  abcdSport: {
    key: "abcdSport",
    scheduleType: "rotation",
    trainingWeekdays: [0, 1, 3, 4],
    days: [
      {
        key: "chestTriceps",
        kind: "gym",
        exercises: [
          ex("Barbell_Bench_Press_-_Medium_Grip", 4, 6, 8),
          ex("Incline_Dumbbell_Press", 3, 8, 10),
          ex("Cable_Crossover", 3, 12, 15),
          ex("Triceps_Pushdown", 3, 10, 12),
          ex("Dips_-_Triceps_Version", 3, 8, 12),
        ],
      },
      {
        key: "backBiceps",
        kind: "gym",
        exercises: [
          ex("Pullups", 4, 6, 10),
          ex("Bent_Over_Barbell_Row", 4, 6, 8),
          ex("Seated_Cable_Rows", 3, 10, 12),
          ex("Barbell_Curl", 3, 8, 12),
          ex("Hammer_Curls", 3, 10, 12),
        ],
      },
      {
        key: "legs",
        kind: "gym",
        exercises: [
          ex("Barbell_Squat", 4, 5, 8),
          ex("Romanian_Deadlift", 3, 8, 10),
          ex("Leg_Press", 3, 10, 12),
          ex("Lying_Leg_Curls", 3, 10, 12),
          ex("Standing_Calf_Raises", 4, 12, 15),
        ],
      },
      {
        key: "shouldersCore",
        kind: "gym",
        exercises: [
          ex("Standing_Military_Press", 4, 6, 8),
          ex("Side_Lateral_Raise", 3, 12, 15),
          ex("Face_Pull", 3, 12, 15),
          ex("Hanging_Leg_Raise", 3, 10, 15),
          ex("Cable_Crunch", 3, 12, 15),
        ],
      },
      { key: "football", kind: "sport", weekday: 2 },
    ],
  },
  // Classic three full-body days: Monday, Wednesday, Friday.
  fullBody3: {
    key: "fullBody3",
    scheduleType: "weekly",
    trainingWeekdays: [],
    days: [
      {
        key: "fullBodyA",
        kind: "gym",
        weekday: 0,
        exercises: [
          ex("Barbell_Squat", 3, 5, 8),
          ex("Barbell_Bench_Press_-_Medium_Grip", 3, 6, 8),
          ex("Bent_Over_Barbell_Row", 3, 8, 10),
          ex("Hanging_Leg_Raise", 3, 10, 12),
        ],
      },
      {
        key: "fullBodyB",
        kind: "gym",
        weekday: 2,
        exercises: [
          ex("Barbell_Deadlift", 3, 5),
          ex("Standing_Military_Press", 3, 6, 8),
          ex("Pullups", 3, 6, 10),
          ex("Dumbbell_Lunges", 3, 10, 12),
        ],
      },
      {
        key: "fullBodyC",
        kind: "gym",
        weekday: 4,
        exercises: [
          ex("Leg_Press", 3, 10, 12),
          ex("Incline_Dumbbell_Press", 3, 8, 10),
          ex("Wide-Grip_Lat_Pulldown", 3, 10, 12),
          ex("Barbell_Curl", 2, 10, 12),
          ex("Triceps_Pushdown", 2, 10, 12),
        ],
      },
    ],
  },
};

export interface TemplateNames {
  routine: string;
  /** Translated name for each day key. */
  day: (key: string, kind: DayKind) => string;
}

/**
 * Builds the rows for a template. Exercises whose catalog entry is missing on this device
 * are skipped (the routine is still usable).
 */
export function instantiateTemplate(
  template: RoutineTemplate,
  userId: string,
  names: TemplateNames,
  exerciseIdBySource: ReadonlyMap<string, string>,
  clock: Clock,
): { routine: Routine; days: RoutineDay[]; exercises: RoutineExercise[] } {
  const routine = newRoutine(
    { userId, name: names.routine, scheduleType: template.scheduleType, trainingWeekdays: template.trainingWeekdays },
    clock,
  );
  const days: RoutineDay[] = [];
  const exercises: RoutineExercise[] = [];
  for (const spec of template.days) {
    const name = names.day(spec.key, spec.kind);
    const day = newDay(
      routine,
      days,
      { kind: spec.kind, name, sport: spec.kind === "sport" ? spec.key : null, weekday: spec.weekday ?? null },
      clock,
    );
    days.push(day);
    const inDay: RoutineExercise[] = [];
    for (const item of spec.exercises ?? []) {
      const exerciseId = exerciseIdBySource.get(item.sourceId);
      if (!exerciseId) continue;
      const row = newRoutineExercise(day, inDay, exerciseId, clock, {
        sets: item.sets,
        repsMin: item.repsMin,
        repsMax: item.repsMax,
      });
      inDay.push(row);
    }
    exercises.push(...inDay);
  }
  return { routine, days, exercises };
}

/** Every catalog id the templates use (for tests and for loading only what is needed). */
export function templateSourceIds(): string[] {
  return [
    ...new Set(
      Object.values(TEMPLATES).flatMap((template) => template.days.flatMap((day) => (day.exercises ?? []).map((e) => e.sourceId))),
    ),
  ];
}

/** Preview of a template's week (same shape as weekStrip). */
export function templateWeekStrip(template: RoutineTemplate): WeekStripDay[] {
  return WEEKDAYS.map((weekday) => ({
    weekday,
    gym:
      template.scheduleType === "weekly"
        ? template.days.some((day) => day.kind === "gym" && day.weekday === weekday)
        : template.trainingWeekdays.includes(weekday),
    sport: template.days.some((day) => day.kind === "sport" && day.weekday === weekday),
  }));
}
