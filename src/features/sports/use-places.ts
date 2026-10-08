"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { placesForSport } from "@/domain/places";
import type { Place } from "@/domain/schemas";
import { useUserData } from "@/features/user-data/user-data-context";

/** Your spots, best first for `sport` (the ones you used for it, most recent first). */
export function usePlacesFor(sport: string): Place[] {
  const { db } = useUserData();
  return (
    useLiveQuery(async () => {
      const [places, sessions] = await Promise.all([
        db.places.toArray(),
        db.sessions.filter((s) => s.place_id !== null && s.place_id !== undefined).toArray(),
      ]);
      return placesForSport(places, sessions, sport);
    }, [db, sport]) ?? []
  );
}

/** Every spot by id (deleted ones included, so old sessions keep their name). Undefined while loading. */
export function usePlaceNames(): Map<string, string> | undefined {
  const { db } = useUserData();
  return useLiveQuery(async () => new Map((await db.places.toArray()).map((p) => [p.id, p.name])), [db]);
}
