// Loads/refreshes the exercise catalog into a Supabase database (local development).
// Production uses the Edge Function in supabase/functions/seed-catalog (same code).
//
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SECRET_KEY=<secret> npm run seed:catalog
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { type CatalogClient, SOURCE_URL, type SourceExercise, syncCatalog } from "../supabase/functions/seed-catalog/catalog.ts";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY (see `npx supabase status`).");
  process.exit(1);
}

// Optional local copy of the dataset (offline development).
const sourceFile = process.env.CATALOG_SOURCE_FILE;
const source = (
  sourceFile ? JSON.parse(await readFile(sourceFile, "utf8")) : await (await fetch(SOURCE_URL)).json()
) as SourceExercise[];

const supabase = createClient(url, key, { auth: { persistSession: false } });
const result = await syncCatalog(supabase as unknown as CatalogClient, source);
console.log(`Catalog: ${result.total} exercises, ${result.changed} written.`);
