import { describe, expect, it } from "vitest";
import { exerciseSchema } from "@/domain/schemas";
import { type CustomExerciseInput, customExerciseRow, inputFromExercise, instructionsFromText } from "./custom-exercise";

const context = { userId: "11111111-1111-4111-8111-111111111111", now: "2026-10-08T10:00:00.000Z", id: "22222222-2222-4222-8222-222222222222" };

describe("customExerciseRow", () => {
  it("creates a valid private exercise for the user", () => {
    const row = customExerciseRow(
      {
        name: "  Hip thrust en máquina ",
        primaryMuscle: "glutes",
        secondaryMuscles: ["hamstrings", "glutes", "hamstrings"],
        equipment: "machine",
        category: "strength",
        instructions: "Apoya la espalda\n\n  Empuja con los talones  ",
      },
      context,
    );
    expect(exerciseSchema.parse(row)).toEqual(row);
    expect(row).toMatchObject({
      id: context.id,
      created_by: context.userId,
      source_id: null,
      name: "Hip thrust en máquina",
      primary_muscle: "glutes",
      secondary_muscles: ["hamstrings"],
      instructions: ["Apoya la espalda", "Empuja con los talones"],
      deleted_at: null,
    });
  });

  it("rejects an empty name or a missing primary muscle", () => {
    const valid: CustomExerciseInput = {
      name: "X",
      primaryMuscle: "glutes",
      secondaryMuscles: [],
      equipment: null,
      category: null,
      instructions: "",
    };
    expect(() => customExerciseRow({ ...valid, name: "   " }, context)).toThrow();
    expect(() => customExerciseRow({ ...valid, primaryMuscle: "wings" as never }, context)).toThrow();
  });

  it("edits keep the id and creation date, and round-trip through the form", () => {
    const created = customExerciseRow(
      { name: "A", primaryMuscle: "chest", secondaryMuscles: [], equipment: null, category: null, instructions: "Paso 1" },
      context,
    );
    const edited = customExerciseRow(
      { ...inputFromExercise(created), name: "B" },
      { ...context, now: "2026-10-09T10:00:00.000Z", existing: created },
    );
    expect(edited.id).toBe(created.id);
    expect(edited.created_at).toBe(created.created_at);
    expect(edited.name).toBe("B");
    expect(inputFromExercise(edited).instructions).toBe("Paso 1");
  });

  it("refuses to edit somebody else's exercise", () => {
    const created = customExerciseRow(
      { name: "A", primaryMuscle: "chest", secondaryMuscles: [], equipment: null, category: null, instructions: "" },
      context,
    );
    expect(() =>
      customExerciseRow(inputFromExercise(created), { ...context, userId: "someone-else", existing: created }),
    ).toThrow();
  });
});

describe("instructionsFromText", () => {
  it("splits lines and drops blanks", () => {
    expect(instructionsFromText("a\n\n b \n")).toEqual(["a", "b"]);
  });
});
