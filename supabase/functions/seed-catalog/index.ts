// Supabase Edge Function (Deno): loads/refreshes the exercise catalog from free-exercise-db.
// Idempotent: only new or changed exercises are written, so calling it again is harmless.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type CatalogClient, SOURCE_URL, type SourceExercise, syncCatalog } from "./catalog.ts";

Deno.serve(async () => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const response = await fetch(SOURCE_URL);
    if (!response.ok) throw new Error(`Could not download the catalog (${response.status})`);
    const source = (await response.json()) as SourceExercise[];
    const result = await syncCatalog(supabase as unknown as CatalogClient, source);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
