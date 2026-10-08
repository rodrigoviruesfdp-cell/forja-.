/**
 * Sports are stored as a fixed code (`boxing`, `surf`…), never as the translated name:
 * "200 days of boxing" must count the same whatever language each session was logged in.
 * A sport that is not in the list is stored as the name the user typed.
 */

export const SPORT_KEYS = [
  "football",
  "padel",
  "running",
  "cycling",
  "swimming",
  "surf",
  "boxing",
  "martial_arts",
  "climbing",
  "tennis",
  "basketball",
  "volleyball",
  "skiing",
  "yoga",
  "hiking",
] as const;

export type SportKey = (typeof SPORT_KEYS)[number];

/**
 * Names (Spanish and English, plus common variants) that mean each sport, written as
 * `normalize` leaves them. The migration 20261008000300_sport_keys.sql uses the same list.
 */
const ALIASES: Record<SportKey, readonly string[]> = {
  football: ["futbol", "football", "soccer"],
  padel: ["padel"],
  running: ["running", "correr", "carrera"],
  cycling: ["ciclismo", "cycling", "bici", "bicicleta"],
  swimming: ["natacion", "swimming", "nadar"],
  surf: ["surf", "surfing"],
  boxing: ["boxeo", "boxing"],
  martial_arts: ["artes marciales", "martial arts"],
  climbing: ["escalada", "climbing"],
  tennis: ["tenis", "tennis"],
  basketball: ["baloncesto", "basketball", "basket"],
  volleyball: ["voleibol", "voley", "volleyball"],
  skiing: ["esqui", "skiing", "ski"],
  yoga: ["yoga"],
  hiking: ["senderismo", "hiking", "trekking"],
};

/** Lowercase, without accents and with single spaces ("  Fútbol " → "futbol"). */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const BY_ALIAS = new Map<string, SportKey>(
  SPORT_KEYS.flatMap((key) => [[key, key] as const, ...ALIASES[key].map((alias) => [alias, key] as const)]),
);

export function isSportKey(value: string | null | undefined): value is SportKey {
  return value !== null && value !== undefined && (SPORT_KEYS as readonly string[]).includes(value);
}

/** The code of a known sport (whatever language or spelling it was typed in), or the trimmed text. */
export function canonicalSport(value: string): string {
  return BY_ALIAS.get(normalize(value)) ?? value.trim().replace(/\s+/g, " ");
}
