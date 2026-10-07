import { describe, expect, it } from "vitest";
import { CATEGORIES, EQUIPMENT, MUSCLES } from "@/domain/exercises/taxonomy";
import {
  catalogId,
  changedRows,
  equipmentKey,
  IMAGE_BASE_URL,
  type SourceExercise,
  toCatalogRow,
  toKey,
  uuidV5,
} from "./catalog";

const benchPress: SourceExercise = {
  id: "Barbell_Bench_Press_-_Medium_Grip",
  name: "Barbell Bench Press - Medium Grip",
  force: "push",
  level: "beginner",
  mechanic: "compound",
  equipment: "barbell",
  primaryMuscles: ["chest"],
  secondaryMuscles: ["shoulders", "triceps"],
  instructions: [" Lie back on a flat bench. ", ""],
  category: "strength",
  images: ["Barbell_Bench_Press_-_Medium_Grip/0.jpg", "Barbell_Bench_Press_-_Medium_Grip/1.jpg"],
};

describe("uuidV5", () => {
  it("matches the RFC 4122 reference vector", async () => {
    expect(await uuidV5("www.example.com", "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(
      "2ed6657d-e927-568b-95e1-2665a8aea6a2",
    );
  });

  it("gives every exercise the same id in every environment", async () => {
    expect(await catalogId("Barbell_Squat")).toBe(await catalogId("Barbell_Squat"));
    expect(await catalogId("Barbell_Squat")).not.toBe(await catalogId("Barbell_Deadlift"));
  });
});

describe("toCatalogRow", () => {
  it("maps the source to database keys and pinned image URLs", async () => {
    const row = await toCatalogRow(benchPress);
    expect(row).toMatchObject({
      source_id: benchPress.id,
      created_by: null,
      name: "Barbell Bench Press - Medium Grip",
      translations: {},
      primary_muscle: "chest",
      secondary_muscles: ["shoulders", "triceps"],
      equipment: "barbell",
      category: "strength",
      mechanic: "compound",
      instructions: ["Lie back on a flat bench."],
    });
    expect(row.image_urls).toEqual([
      `${IMAGE_BASE_URL}/Barbell_Bench_Press_-_Medium_Grip/0.jpg`,
      `${IMAGE_BASE_URL}/Barbell_Bench_Press_-_Medium_Grip/1.jpg`,
    ]);
  });

  it("moves extra primary muscles to secondary without duplicates", async () => {
    const row = await toCatalogRow(
      { ...benchPress, primaryMuscles: ["lower back", "hamstrings"], secondaryMuscles: ["hamstrings", "glutes"] },
    );
    expect(row.primary_muscle).toBe("lower_back");
    expect(row.secondary_muscles).toEqual(["hamstrings", "glutes"]);
  });

  it("only produces keys the app knows how to translate", () => {
    const sourceMuscles = ["abdominals", "abductors", "adductors", "biceps", "calves", "chest", "forearms", "glutes",
      "hamstrings", "lats", "lower back", "middle back", "neck", "quadriceps", "shoulders", "traps", "triceps"];
    const sourceEquipment = ["barbell", "dumbbell", "other", "body only", "cable", "machine", "kettlebells", "bands",
      "medicine ball", "exercise ball", "foam roll", "e-z curl bar"];
    const sourceCategories = ["strength", "stretching", "plyometrics", "powerlifting", "olympic weightlifting",
      "strongman", "cardio"];

    expect(sourceMuscles.map(toKey).every((key) => (MUSCLES as readonly string[]).includes(key))).toBe(true);
    expect(sourceEquipment.map(equipmentKey).every((key) => (EQUIPMENT as readonly string[]).includes(key!))).toBe(true);
    expect(sourceCategories.map(toKey).every((key) => (CATEGORIES as readonly string[]).includes(key))).toBe(true);
    expect(equipmentKey(null)).toBeNull();
  });
});

describe("changedRows", () => {
  it("skips rows that are already up to date, regardless of key order", async () => {
    const row = await toCatalogRow(benchPress);
    const sameButReordered = JSON.parse(JSON.stringify(row));
    expect(changedRows([row], [sameButReordered])).toEqual([]);
    expect(changedRows([row], [{ ...sameButReordered, name: "Old name" }])).toEqual([row]);
    expect(changedRows([row], [])).toEqual([row]);
  });
});
