import { isQaDeploymentContext } from "@/lib/runtime/qaDeploymentContext";

const OAUTH_HANDOFF_CANDIDATES = ["top_oauth_mobile_handoffs", "torp_oauth_mobile_handoffs"];
const PROFILE_CANDIDATES = ["top_profiles", "torp_profiles"];

let cachedOauthHandoffTable = null;
let cachedProfileTable = null;

function uniqueNames(names) {
  const out = [];
  for (const name of names) {
    const n = String(name || "").trim();
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @returns {Promise<string | null>}
 */
export async function resolveOauthHandoffTable(admin) {
  if (cachedOauthHandoffTable) return cachedOauthHandoffTable;
  const explicit = String(process.env.OAUTH_HANDOFF_TABLE || "").trim();
  const candidates = uniqueNames([
    explicit,
    ...OAUTH_HANDOFF_CANDIDATES,
  ]);
  if (!admin) return candidates[0] || "top_oauth_mobile_handoffs";

  for (const table of candidates) {
    const { error } = await admin.from(table).select("state_key").limit(1);
    if (!error) {
      cachedOauthHandoffTable = table;
      return table;
    }
  }
  return candidates[0] || "top_oauth_mobile_handoffs";
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} [admin]
 * @returns {Promise<string>}
 */
export async function resolveProfileTable(admin) {
  if (cachedProfileTable) return cachedProfileTable;

  const explicit = String(
    process.env.PROFILE_TABLE ||
      process.env.TOP_PROFILE_TABLE ||
      process.env.NEXT_PUBLIC_PROFILE_TABLE ||
      "",
  ).trim();
  if (explicit) {
    cachedProfileTable = explicit;
    return explicit;
  }

  const vercelEnv = String(process.env.VERCEL_ENV || "").toLowerCase();
  if (isQaDeploymentContext() || vercelEnv === "preview") {
    cachedProfileTable = "top_qa_profiles";
    return cachedProfileTable;
  }

  const candidates = uniqueNames(PROFILE_CANDIDATES);
  if (admin) {
    for (const table of candidates) {
      const { error } = await admin.from(table).select("id").limit(1);
      if (!error) {
        cachedProfileTable = table;
        return table;
      }
    }
  }

  cachedProfileTable = "top_profiles";
  return cachedProfileTable;
}

/** Reset caches (tests). */
export function resetSupabaseTableNameCache() {
  cachedOauthHandoffTable = null;
  cachedProfileTable = null;
}
