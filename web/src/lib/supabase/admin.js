import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for trusted server routes only. Returns null if misconfigured.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function profileTableName() {
  return process.env.NEXT_PUBLIC_PROFILE_TABLE || "torp_profiles";
}
