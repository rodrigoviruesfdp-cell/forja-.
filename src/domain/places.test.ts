import { describe, expect, it } from "vitest";
import { findPlace, newPlace, placeKey, placesForSport } from "./places";
import { NOW, testClock, USER } from "./routines/test-fixtures";
import { placeSchema, type Place } from "./schemas";

const place = (id: string, name: string, sport: string | null = null): Place => ({
  id,
  user_id: USER,
  name,
  sport,
  created_at: NOW,
  updated_at: NOW,
  deleted_at: null,
});

describe("places", () => {
  it("names compare without accents, case or extra spaces", () => {
    expect(placeKey("  La  Zurriola ")).toBe(placeKey("la zurriola"));
    expect(placeKey("Mundaka")).toBe(placeKey("MUNDÁKA"));
    expect(findPlace([place("p1", "Zurriola")], " zurriola")?.id).toBe("p1");
    expect(findPlace([{ ...place("p1", "Zurriola"), deleted_at: NOW }], "zurriola")).toBeUndefined();
  });

  it("a new spot is trimmed and remembers its sport as a code", () => {
    expect(placeSchema.parse(newPlace(USER, "  Playa  de Somo ", "Surf", testClock()))).toMatchObject({
      name: "Playa de Somo",
      sport: "surf",
    });
  });

  it("lists the spots used for the sport first (most recent first), then its own, then the rest", () => {
    const places = [place("gym", "Rocódromo", "climbing"), place("old", "Mundaka", "surf"), place("new", "Zurriola"), place("own", "Somo", "surf")];
    const sessions = [
      { place_id: "old", sport: "surf", date: "2026-09-01", deleted_at: null },
      { place_id: "new", sport: "surf", date: "2026-10-01", deleted_at: null },
      { place_id: "gym", sport: "climbing", date: "2026-10-05", deleted_at: null },
    ];
    expect(placesForSport(places, sessions, "surf").map((p) => p.id)).toEqual(["new", "old", "own", "gym"]);
  });
});
