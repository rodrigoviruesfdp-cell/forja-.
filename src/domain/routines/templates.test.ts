import { describe, expect, it } from "vitest";
import spanishNames from "@/i18n/exercise-names/es.json";
import { routineDaySchema, routineExerciseSchema, routineSchema } from "../schemas";
import { instantiateTemplate, TEMPLATES, templateSourceIds } from "./templates";
import { testClock, USER } from "./test-fixtures";

const names = { routine: "Plantilla", day: (key: string) => key };

describe("templates", () => {
  it("only use exercises that exist in the pinned catalog", () => {
    // Every catalog exercise has a Spanish name, so the names file doubles as the catalog index.
    const catalog = new Set(Object.keys(spanishNames));
    expect(templateSourceIds().filter((id) => !catalog.has(id))).toEqual([]);
  });

  it("build rows the database accepts", () => {
    const ids = new Map(templateSourceIds().map((sourceId, index) => [sourceId, `cccccccc-0000-4000-8000-${String(index).padStart(12, "0")}`]));
    for (const template of Object.values(TEMPLATES)) {
      const result = instantiateTemplate(template, USER, names, ids, testClock());
      routineSchema.parse(result.routine);
      result.days.forEach((d) => routineDaySchema.parse(d));
      result.exercises.forEach((e) => routineExerciseSchema.parse(e));
      expect(result.days.every((d) => d.routine_id === result.routine.id)).toBe(true);
    }
  });

  it("the A/B/C/D rotation pins the sport and leaves gym days unpinned", () => {
    const result = instantiateTemplate(TEMPLATES.abcdSport, USER, names, new Map(), testClock());
    expect(result.routine).toMatchObject({ schedule_type: "rotation", training_weekdays: [0, 1, 3, 4] });
    expect(result.days.filter((d) => d.kind === "gym").map((d) => d.weekday)).toEqual([null, null, null, null]);
    expect(result.days.find((d) => d.kind === "sport")).toMatchObject({ weekday: 2, sport: "football" });
    expect(result.exercises).toEqual([]); // no catalog on this "device": the routine still works
  });
});
