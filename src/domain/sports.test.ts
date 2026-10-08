import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/i18n/config";
import { canonicalSport, isSportKey, SPORT_KEYS } from "./sports";

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
