import { describe, expect, it } from "vitest";
import { formatWeight, fromKg, KG_PER_LB, parseDecimal, toKg } from "./units";

describe("toKg / fromKg", () => {
  it("keeps kg values as they are", () => {
    expect(toKg(102.5, "kg")).toBe(102.5);
    expect(fromKg(102.5, "kg")).toBe(102.5);
  });

  it("converts pounds to kg at storage precision", () => {
    expect(toKg(225, "lb")).toBe(102.058);
    expect(toKg(1, "lb")).toBe(0.454);
  });

  it("round-trips common pound loads without drifting", () => {
    for (const lb of [2.5, 5, 45, 135, 185, 225, 315, 405, 500]) {
      expect(fromKg(toKg(lb, "lb"), "lb")).toBe(lb);
    }
  });

  it("round-trips kg loads with quarter-kilo plates", () => {
    for (const kg of [0.25, 1.25, 61.25, 102.5, 182.75]) {
      expect(fromKg(toKg(kg, "kg"), "kg")).toBe(kg);
    }
  });

  it("uses the exact international pound", () => {
    expect(KG_PER_LB).toBe(0.45359237);
  });
});

describe("formatWeight", () => {
  it("formats with the locale decimal separator", () => {
    expect(formatWeight(102.5, "kg", "es")).toBe("102,5 kg");
    expect(formatWeight(102.5, "kg", "en")).toBe("102.5 kg");
  });

  it("shows pounds rounded to one decimal", () => {
    expect(formatWeight(100, "lb", "en")).toBe("220.5 lb");
    expect(formatWeight(toKg(225, "lb"), "lb", "en")).toBe("225 lb");
  });
});

describe("parseDecimal", () => {
  it("accepts comma and dot as decimal separators", () => {
    expect(parseDecimal("102,5")).toBe(102.5);
    expect(parseDecimal("102.5")).toBe(102.5);
    expect(parseDecimal(" 80 ")).toBe(80);
    expect(parseDecimal(".5")).toBe(0.5);
    expect(parseDecimal("80.")).toBe(80);
  });

  it("rejects empty, negative and malformed input", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("-5")).toBeNull();
    expect(parseDecimal("1,2,3")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("1e3")).toBeNull();
  });
});
