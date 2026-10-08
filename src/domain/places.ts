/**
 * Spots: each user's own list of places (a surf break, a climbing gym, a boxing club…).
 * Only a name for now; picking from the list keeps "Zurriola" and "zurriola" the same spot,
 * which is what lets "100 different spots" count right later.
 */
import type { Clock } from "./routines/builder";
import { canonicalSport } from "./sports";
import type { Place, Session } from "./schemas";

export const PLACE_NAME_MAX = 80;

/** How two names compare: no accents, no case, single spaces. */
export function placeKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function cleanPlaceName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, PLACE_NAME_MAX);
}

/** The existing spot with that name, if any (so typing a known name never duplicates it). */
export function findPlace(places: readonly Place[], name: string): Place | undefined {
  const key = placeKey(name);
  return places.find((place) => !place.deleted_at && placeKey(place.name) === key);
}

export function newPlace(userId: string, name: string, sport: string | null, clock: Clock): Place {
  return {
    id: clock.newId(),
    user_id: userId,
    name: cleanPlaceName(name),
    sport: sport ? canonicalSport(sport) : null,
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
}

/**
 * Spots in the order you will want them for a sport: the ones you used for it (most recent
 * first), then the ones created for it, then the rest alphabetically.
 */
export function placesForSport(
  places: readonly Place[],
  sessions: readonly Pick<Session, "place_id" | "sport" | "date" | "deleted_at">[],
  sport: string,
): Place[] {
  const code = canonicalSport(sport);
  const lastUse = new Map<string, string>();
  for (const session of sessions) {
    if (session.deleted_at || !session.place_id || canonicalSport(session.sport ?? "") !== code) continue;
    const seen = lastUse.get(session.place_id);
    if (!seen || session.date > seen) lastUse.set(session.place_id, session.date);
  }
  const rank = (place: Place) => (lastUse.has(place.id) ? 0 : place.sport === code ? 1 : 2);
  return places
    .filter((place) => !place.deleted_at)
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (lastUse.get(b.id) ?? "").localeCompare(lastUse.get(a.id) ?? "") ||
        a.name.localeCompare(b.name),
    );
}
