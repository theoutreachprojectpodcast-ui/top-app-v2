import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client for public catalog reads. Prefers the service role when set so
 * localhost matches enrichment writes (same key as moderator APIs) and survives stricter RLS on anon.
 */
export function createSupabaseReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const key = service || anon;
  if (!url || !key) return null;
  return createClient(url, key);
}
