"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { defaultProfile, type ProfilePatch, updateProfile } from "@/data/repositories/profiles";
import type { Profile } from "@/domain/schemas";
import { getPrefs, setPrefs } from "@/features/preferences/prefs";
import { useUserData } from "@/features/user-data/user-data-context";

/** Live profile from the local database (undefined while loading). */
export function useProfile(): Profile | undefined {
  const { db, user } = useUserData();
  return useLiveQuery(() => db.profiles.get(user.id), [db, user.id]);
}

/** Saves profile changes locally (synced in the background) and mirrors language/units to the device. */
export function useUpdateProfile() {
  const { db, user } = useUserData();
  return useCallback(
    async (patch: ProfilePatch) => {
      if (patch.locale || patch.units) {
        setPrefs({ ...(patch.locale && { locale: patch.locale }), ...(patch.units && { units: patch.units }) });
      }
      const current = (await db.profiles.get(user.id)) ?? defaultProfile(user.id, user.email, getPrefs());
      return updateProfile(db, current, patch);
    },
    [db, user],
  );
}
