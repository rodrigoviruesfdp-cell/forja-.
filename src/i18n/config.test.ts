import { describe, expect, it } from "vitest";
import { detectLocale, MESSAGES } from "./config";

describe("detectLocale", () => {
  it("uses the first supported language of the phone", () => {
    expect(detectLocale(["en-GB", "es-ES"])).toBe("en");
    expect(detectLocale(["fr-FR", "es-MX"])).toBe("es");
  });

  it("falls back to Spanish", () => {
    expect(detectLocale(["de-DE"])).toBe("es");
    expect(detectLocale([])).toBe("es");
  });
});

describe("messages", () => {
  function keys(obj: object, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([key, value]) =>
      typeof value === "object" && value !== null ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
    );
  }

  it("English and Spanish have exactly the same keys", () => {
    expect(keys(MESSAGES.en).sort()).toEqual(keys(MESSAGES.es).sort());
  });

  it("no message is empty", () => {
    function values(obj: object): string[] {
      return Object.values(obj).flatMap((value) =>
        typeof value === "object" && value !== null ? values(value) : [String(value)],
      );
    }
    for (const locale of ["es", "en"] as const) {
      expect(values(MESSAGES[locale]).every((text) => text.trim().length > 0)).toBe(true);
    }
  });
});
