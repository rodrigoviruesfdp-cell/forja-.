/**
 * Public Supabase settings (safe to expose: the publishable key only works
 * together with Row Level Security). Configured in .env.local / Vercel.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = supabaseUrl !== "" && supabasePublishableKey !== "";
