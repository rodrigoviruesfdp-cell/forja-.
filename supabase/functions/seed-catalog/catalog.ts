/**
 * Exercise catalog built from free-exercise-db (https://github.com/yuhonas/free-exercise-db),
 * released into the public domain (Unlicense). Pure TypeScript with no runtime-specific APIs:
 * shared by the Supabase Edge Function (Deno), the local seed script (Node) and the tests.
 *
 * The database keeps the original (English) data. Translated names ship with the app
 * (src/i18n/exercise-names/*.json, keyed by source_id), so fixing a translation is a
 * normal deploy and never rewrites catalog rows.
 */

/** Pinned commit, so the catalog (and image URLs) never change under our feet. */
export const SOURCE_COMMIT = "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5";
export const SOURCE_URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${SOURCE_COMMIT}/dist/exercises.json`;
export const IMAGE_BASE_URL = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${SOURCE_COMMIT}/exercises`;

/** Namespace for deterministic ids: the same exercise gets the same id in every environment. */
export const CATALOG_UUID_NAMESPACE = "0de43e12-ffed-4a88-88c4-ff6367cd7c00";

export interface SourceExercise {
  id: string;
  name: string;
  force?: string | null;
  level?: string | null;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category?: string | null;
  images: string[];
}

export interface CatalogRow {
  id: string;
  source_id: string;
  created_by: null;
  name: string;
  translations: Record<string, never>;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string | null;
  category: string | null;
  mechanic: "compound" | "isolation" | null;
  instructions: string[];
  image_urls: string[];
  deleted_at: null;
}

/** Keys stored in the database; the app translates them (src/domain/exercises/taxonomy.ts). */
const EQUIPMENT_KEYS: Record<string, string> = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  "body only": "body_only",
  cable: "cable",
  machine: "machine",
  kettlebells: "kettlebell",
  bands: "bands",
  "medicine ball": "medicine_ball",
  "exercise ball": "exercise_ball",
  "foam roll": "foam_roll",
  "e-z curl bar": "ez_bar",
  other: "other",
};

export function toKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function equipmentKey(value: string | null | undefined): string | null {
  if (!value) return null;
  return EQUIPMENT_KEYS[value] ?? toKey(value);
}

export async function uuidV5(name: string, namespace: string): Promise<string> {
  const ns = namespace.replace(/-/g, "");
  const nsBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) nsBytes[i] = parseInt(ns.slice(i * 2, i * 2 + 2), 16);
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(nsBytes.length + nameBytes.length);
  data.set(nsBytes);
  data.set(nameBytes, nsBytes.length);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", data)).slice(0, 16);
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function catalogId(sourceId: string): Promise<string> {
  return uuidV5(`free-exercise-db:${sourceId}`, CATALOG_UUID_NAMESPACE);
}

export async function toCatalogRow(source: SourceExercise): Promise<CatalogRow> {
  const [primary, ...extraPrimary] = source.primaryMuscles.map(toKey);
  if (!primary) throw new Error(`Exercise ${source.id} has no primary muscle`);
  const secondary = [...new Set([...extraPrimary, ...source.secondaryMuscles.map(toKey)])].filter(
    (muscle) => muscle !== primary,
  );
  const mechanic = source.mechanic === "compound" || source.mechanic === "isolation" ? source.mechanic : null;

  return {
    id: await catalogId(source.id),
    source_id: source.id,
    created_by: null,
    name: source.name.trim(),
    translations: {},
    primary_muscle: primary,
    secondary_muscles: secondary,
    equipment: equipmentKey(source.equipment),
    category: source.category ? toKey(source.category) : null,
    mechanic,
    instructions: source.instructions.map((step) => step.trim()).filter(Boolean),
    image_urls: source.images.map((path) => `${IMAGE_BASE_URL}/${path}`),
    deleted_at: null,
  };
}

export function buildCatalogRows(source: SourceExercise[]): Promise<CatalogRow[]> {
  return Promise.all(source.map((exercise) => toCatalogRow(exercise)));
}

const COMPARED_COLUMNS = [
  "name",
  "translations",
  "primary_muscle",
  "secondary_muscles",
  "equipment",
  "category",
  "mechanic",
  "instructions",
  "image_urls",
  "deleted_at",
] as const;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Rows that are new or differ from what the database already has. Writing only these keeps
 * re-seeding cheap: unchanged exercises keep their updated_at, so phones don't re-download them.
 */
export function changedRows(rows: CatalogRow[], existing: Partial<CatalogRow>[]): CatalogRow[] {
  const byId = new Map(existing.map((row) => [row.id, row]));
  return rows.filter((row) => {
    const current = byId.get(row.id);
    if (!current) return true;
    return COMPARED_COLUMNS.some((column) => stable(row[column]) !== stable(current[column]));
  });
}

/** The few Supabase client methods the sync needs (works with supabase-js in Deno and Node). */
export interface CatalogClient {
  from(table: "exercises"): {
    select(columns: string): {
      not(column: string, operator: string, value: null): {
        range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
    upsert(
      rows: CatalogRow[],
      options: { onConflict: string },
    ): PromiseLike<{ error: { message: string } | null }>;
  };
}

export async function syncCatalog(
  client: CatalogClient,
  source: SourceExercise[],
): Promise<{ total: number; changed: number }> {
  const rows = await buildCatalogRows(source);

  const existing: Partial<CatalogRow>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from("exercises")
      .select(["id", ...COMPARED_COLUMNS].join(","))
      .not("source_id", "is", null)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    existing.push(...((data ?? []) as Partial<CatalogRow>[]));
    if (!data || data.length < 1000) break;
  }

  const changed = changedRows(rows, existing);
  for (let i = 0; i < changed.length; i += 200) {
    const { error } = await client.from("exercises").upsert(changed.slice(i, i + 200), { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
  return { total: rows.length, changed: changed.length };
}
