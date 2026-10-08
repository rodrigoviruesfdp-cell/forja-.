import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/i18n/config";
import { canonicalSport, cleanMetrics, isSportKey, SPORT_KEYS, sportProfile } from "./sports";

describe("canonicalSport", () => {
  it("turns a known sport into its code, in any language, case or accent", () => {
    expect(canonicalSport("Fútbol")).toBe("football");
    expect(canonicalSport("  futbol ")).toBe("football");
    expect(canonicalSport("Football")).toBe("football");
    expect(canonicalSport("BOXEO")).toBe("boxing");
    expect(canonicalSport("Artes  marciales")).toBe("martial_arts");
    expect(canonicalSport("surf")).toBe("surf");
  });

  it("keeps a sport that is not in the list as typed (trimmed)", () => {
    expect(canonicalSport("  Surf de remo ")).toBe("Surf de remo");
    expect(isSportKey(canonicalSport("Pickleball"))).toBe(false);
  });

  it("every translated name in the app maps back to its own code", () => {
    for (const locale of ["es", "en"] as const) {
      for (const key of SPORT_KEYS) {
        expect(canonicalSport(MESSAGES[locale].sports[key])).toBe(key);
      }
    }
  });
});

describe("sportProfile and cleanMetrics", () => {
  it("asks each sport what makes sense", () => {
    expect(sportProfile("surf")).toEqual({ distance: false, metrics: ["waves"], placeLabel: "spot" });
    expect(sportProfile("Boxeo")).toMatchObject({ distance: false, metrics: ["rounds"], placeLabel: "place" });
    expect(sportProfile("running")).toMatchObject({ distance: true, metrics: [] });
    expect(sportProfile("football").distance).toBe(false);
    // A sport that is not in the list may have a distance (rowing, skating…).
    expect(sportProfile("Remo").distance).toBe(true);
  });

  it("keeps only the sport's own metrics, as whole numbers within limits", () => {
    expect(cleanMetrics("surf", { waves: 14.4, rounds: 3, junk: "x" })).toEqual({ waves: 14 });
    expect(cleanMetrics("boxing", { rounds: 0 })).toEqual({});
    expect(cleanMetrics("surf", { waves: 5000 })).toEqual({ waves: 1000 });
    expect(cleanMetrics("running", { waves: 3 })).toEqual({});
  });
});
