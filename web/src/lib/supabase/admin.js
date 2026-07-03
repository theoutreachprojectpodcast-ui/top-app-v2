import { createClient } from "@supabase/supabase-js";
import { isQaDeploymentContext } from "@/lib/runtime/qaDeploymentContext";

export { resolveOauthHandoffTable, resolveProfileTable } from "@/lib/supabase/tableNames";

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
  const explicit =
    process.env.PROFILE_TABLE || process.env.TOP_PROFILE_TABLE || process.env.NEXT_PUBLIC_PROFILE_TABLE;
  if (String(explicit || "").trim()) return String(explicit).trim();
  const vercelEnv = String(process.env.VERCEL_ENV || "").toLowerCase();
  if (isQaDeploymentContext() || vercelEnv === "preview") return "top_qa_profiles";
  return "top_profiles";
}
