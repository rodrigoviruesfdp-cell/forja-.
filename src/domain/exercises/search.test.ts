import { describe, expect, it } from "vitest";
import type { Exercise } from "@/domain/schemas";
import { exerciseDisplayName } from "./names";
import { buildSearchIndex, EMPTY_FILTERS, normalizeText, searchExercises } from "./search";

function exercise(patch: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    created_by: null,
    source_id: patch.id,
    translations: {},
    primary_muscle: "chest",
    secondary_muscles: [],
    equipment: "barbell",
    category: "strength",
    mechanic: "compound",
    instructions: [],
    image_urls: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...patch,
  };
}

const catalog = [
  exercise({ id: "Barbell_Squat", name: "Barbell Squat", primary_muscle: "quadriceps" }),
  exercise({ id: "Smith_Machine_Squat", name: "Smith Machine Squat", primary_muscle: "quadriceps", equipment: "machine" }),
  exercise({ id: "Barbell_Bench_Press", name: "Barbell Bench Press - Medium Grip" }),
  exercise({ id: "Dumbbell_Bench_Press", name: "Dumbbell Bench Press", equipment: "dumbbell" }),
  exercise({ id: "Hammer_Curls", name: "Hammer Curls", primary_muscle: "biceps", equipment: "dumbbell" }),
  exercise({ id: "Old", name: "Deleted exercise", deleted_at: "2026-02-01T00:00:00Z" }),
  exercise({ id: "mine", source_id: null, created_by: "u1", name: "Hip thrust en máquina", primary_muscle: "glutes", equipment: "machine" }),
];

const names = {
  Barbell_Squat: "Sentadilla con barra",
  Smith_Machine_Squat: "Sentadilla en multipower",
  Barbell_Bench_Press: "Press de banca con barra (agarre medio)",
  Dumbbell_Bench_Press: "Press de banca con mancuernas",
  Hammer_Curls: "Curl martillo",
};

const labels = {
  muscle: (key: string) => ({ quadriceps: "Cuádriceps", chest: "Pecho", biceps: "Bíceps", glutes: "Glúteos" })[key] ?? key,
  equipment: (key: string) => ({ barbell: "Barra", dumbbell: "Mancuernas", machine: "Máquina" })[key] ?? key,
};

const index = buildSearchIndex(catalog, names, labels);
const ids = (filters: Partial<typeof EMPTY_FILTERS>) =>
  searchExercises(index, { ...EMPTY_FILTERS, ...filters }, "es").map((e) => e.exercise.id);

describe("normalizeText", () => {
  it("ignores accents, case and punctuation", () => {
    expect(normalizeText("Press de Banca (agarre MEDIO)")).toBe("press de banca agarre medio");
    expect(normalizeText("Glúteos")).toBe("gluteos");
  });
});

describe("exerciseDisplayName", () => {
  it("translates catalog exercises and keeps custom names as typed", () => {
    expect(exerciseDisplayName(catalog[0]!, names)).toBe("Sentadilla con barra");
    expect(exerciseDisplayName(catalog[6]!, names)).toBe("Hip thrust en máquina");
    expect(exerciseDisplayName({ name: "Unknown", source_id: "Missing" }, names)).toBe("Unknown");
  });
});

describe("searchExercises", () => {
  it("finds by Spanish or English name, without accents, in any word order", () => {
    expect(ids({ query: "sentadilla" })).toEqual(["Barbell_Squat", "Smith_Machine_Squat"]);
    expect(ids({ query: "squat" })).toEqual(["Barbell_Squat", "Smith_Machine_Squat"]);
    expect(ids({ query: "banca mancuernas" })).toEqual(["Dumbbell_Bench_Press"]);
    expect(ids({ query: "maquina hip" })).toEqual(["mine"]);
  });

  it("matches muscle and equipment names too", () => {
    expect(ids({ query: "gluteos" })).toEqual(["mine"]);
    expect(ids({ query: "pecho mancuernas" })).toEqual(["Dumbbell_Bench_Press"]);
  });

  it("ranks names that start with the query first", () => {
    expect(ids({ query: "curl" })[0]).toBe("Hammer_Curls");
    expect(ids({ query: "press" })).toEqual(["Dumbbell_Bench_Press", "Barbell_Bench_Press"]);
  });

  it("filters by primary muscle, equipment and own exercises", () => {
    expect(ids({ muscle: "quadriceps", equipment: "machine" })).toEqual(["Smith_Machine_Squat"]);
    expect(ids({ onlyCustom: true })).toEqual(["mine"]);
    expect(ids({ query: "press", equipment: "barbell" })).toEqual(["Barbell_Bench_Press"]);
  });

  it("never shows deleted exercises and lists your own first when browsing", () => {
    const all = ids({});
    expect(all).not.toContain("Old");
    expect(all[0]).toBe("mine");
    expect(all.slice(1)).toEqual([
      "Hammer_Curls",
      "Barbell_Bench_Press",
      "Dumbbell_Bench_Press",
      "Barbell_Squat",
      "Smith_Machine_Squat",
    ]);
  });
});
