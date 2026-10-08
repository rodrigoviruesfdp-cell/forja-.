import { describe, expect, it } from "vitest";
import { estimateOneRepMax, MAX_REPS_FOR_ESTIMATE } from "./one-rep-max";

describe("estimateOneRepMax (Epley)", () => {
  it("is weight × (1 + reps / 30)", () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.667, 3);
    expect(estimateOneRepMax(60, 10)).toBeCloseTo(80, 6);
    expect(estimateOneRepMax(62.5, 8)).toBeCloseTo(79.167, 3);
  });

  it("is the weight itself for a single rep", () => {
    expect(estimateOneRepMax(140, 1)).toBe(140);
  });

  it("is not estimated without weight, without reps or for long sets", () => {
    expect(estimateOneRepMax(0, 10)).toBeNull();
    expect(estimateOneRepMax(80, 0)).toBeNull();
    expect(estimateOneRepMax(40, MAX_REPS_FOR_ESTIMATE + 1)).toBeNull();
    expect(estimateOneRepMax(40, MAX_REPS_FOR_ESTIMATE)).toBeCloseTo(56, 6);
  });
});
