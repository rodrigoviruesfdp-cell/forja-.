import type { LocalDb } from "@/data/local/db";
import { saveRows } from "@/data/local/mutations";
import { PROFILE_DEFAULTS, type Profile, profileSchema } from "@/domain/schemas";

export type ProfilePatch = Partial<
  Pick<
    Profile,
    "display_name" | "goal" | "level" | "units" | "locale" | "injury_notes" | "active_routine_id" | "username"
  >
>;

/** Applies a change to the profile, validated against the same rules as the database. */
export async function updateProfile(db: LocalDb, current: Profile, patch: ProfilePatch): Promise<Profile> {
  const next = profileSchema.parse({ ...PROFILE_DEFAULTS, ...current, ...patch });
  await saveRows(db, "profiles", [next]);
  return next;
}

/** The server creates the profile on sign-up; this covers the rare case it is missing locally. */
export function defaultProfile(userId: string, email: string | null, prefs: Pick<Profile, "units" | "locale">): Profile {
  const now = new Date().toISOString();
  return {
    id: userId,
    display_name: email ? (email.split("@")[0] ?? null) : null,
    goal: null,
    level: null,
    units: prefs.units,
    locale: prefs.locale,
    injury_notes: null,
    active_routine_id: null,
    ...PROFILE_DEFAULTS,
    created_at: now,
    updated_at: now,
  };
}

/** Usernames are typed loosely ("@Rodrigo") and stored normalized ("rodrigo"). */
export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

/** Trims text fields and turns empty strings into null, like the forms expect. */
export function cleanText(value: string, max: number): string | null {
  const trimmed = value.trim().slice(0, max);
  return trimmed === "" ? null : trimmed;
}
