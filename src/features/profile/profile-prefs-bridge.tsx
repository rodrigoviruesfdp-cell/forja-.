"use client";

import { useEffect } from "react";
import { setPrefs } from "@/features/preferences/prefs";
import { useProfile } from "./use-profile";

/** The profile is the source of truth: a language or unit change made on another device wins here too. */
export function ProfilePrefsBridge() {
  const profile = useProfile();
  const locale = profile?.locale;
  const units = profile?.units;

  useEffect(() => {
    if (locale && units) setPrefs({ locale, units });
  }, [locale, units]);

  return null;
}
