import { useSyncExternalStore } from "react";
import { detectLocale, type Locale } from "@/i18n/config";
import { LOCALES } from "@/domain/schemas";
import { WEIGHT_UNITS, type WeightUnit } from "@/domain/units";
import { PREFS_STORAGE_KEY } from "./storage-key";

export { PREFS_STORAGE_KEY };

export const THEMES = ["dark", "light", "system"] as const;
export type Theme = (typeof THEMES)[number];

/**
 * Device preferences, readable synchronously at startup (localStorage) so the
 * first frame already has the right language, units and theme. Language and
 * units are mirrored from the profile, which is the source of truth.
 */
export interface Prefs {
  locale: Locale;
  units: WeightUnit;
  theme: Theme;
}


const SERVER_PREFS: Prefs = { locale: "es", units: "kg", theme: "dark" };

let cached: Prefs | null = null;
const listeners = new Set<() => void>();

function read(): Prefs {
  const fallback: Prefs = {
    locale: detectLocale(typeof navigator === "undefined" ? [] : navigator.languages),
    units: "kg",
    theme: "dark",
  };
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      locale: (LOCALES as readonly string[]).includes(parsed.locale ?? "") ? parsed.locale! : fallback.locale,
      units: (WEIGHT_UNITS as readonly string[]).includes(parsed.units ?? "") ? parsed.units! : fallback.units,
      theme: (THEMES as readonly string[]).includes(parsed.theme ?? "") ? parsed.theme! : fallback.theme,
    };
  } catch {
    return fallback;
  }
}

export function getPrefs(): Prefs {
  cached ??= read();
  return cached;
}

export function setPrefs(patch: Partial<Prefs>): void {
  const next = { ...getPrefs(), ...patch };
  if (next.locale === cached?.locale && next.units === cached.units && next.theme === cached.theme) return;
  cached = next;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full: keep the in-memory value for this visit.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, () => SERVER_PREFS);
}

export function resolveDark(theme: Theme): boolean {
  if (theme === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches;
  return theme === "dark";
}
