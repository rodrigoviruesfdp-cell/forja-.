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

// ---------------------------------------------------------------------------
// What each sport records (besides duration, effort and notes, which every sport has).

/** Things a sport counts, stored in `sessions.metrics`. */
export const METRIC_KEYS = ["waves", "rounds", "routes"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export const METRIC_MAX: Record<MetricKey, number> = { waves: 1000, rounds: 200, routes: 500 };

export interface SportProfile {
  /** Distance makes sense (running, cycling…). */
  distance: boolean;
  metrics: readonly MetricKey[];
  /** "spot" for surf (that is what surfers call it), "place" for the rest. */
  placeLabel: "spot" | "place";
}

const DISTANCE_SPORTS: readonly SportKey[] = ["running", "cycling", "swimming", "hiking", "skiing"];

const SPORT_METRICS: Partial<Record<SportKey, readonly MetricKey[]>> = {
  surf: ["waves"],
  boxing: ["rounds"],
  martial_arts: ["rounds"],
  climbing: ["routes"],
};

/** What to ask for a sport. A sport that is not in the list may have a distance (rowing, skating…). */
export function sportProfile(sport: string): SportProfile {
  const key = canonicalSport(sport);
  if (!isSportKey(key)) return { distance: true, metrics: [], placeLabel: "place" };
  return {
    distance: DISTANCE_SPORTS.includes(key),
    metrics: SPORT_METRICS[key] ?? [],
    placeLabel: key === "surf" ? "spot" : "place",
  };
}

/** Only the metrics the sport has, as whole numbers within limits; zeros and blanks are dropped. */
export function cleanMetrics(sport: string, metrics: Readonly<Record<string, unknown>>): Record<string, number> {
  const clean: Record<string, number> = {};
  for (const key of sportProfile(sport).metrics) {
    const value = metrics[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const whole = Math.min(METRIC_MAX[key], Math.max(0, Math.round(value)));
    if (whole > 0) clean[key] = whole;
  }
  return clean;
}
