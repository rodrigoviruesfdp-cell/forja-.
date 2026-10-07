import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

let client: SupabaseClient | null = null;

/** Browser Supabase client. The session lives in localStorage, so it survives going offline. */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  }
  client ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Magic links from the default Supabase email land with the session in the URL.
      detectSessionInUrl: true,
      // Implicit flow: the link works even if it opens in a different browser than the one that asked for it.
      flowType: "implicit",
      storageKey: "forja.auth",
    },
  });
  return client;
}
