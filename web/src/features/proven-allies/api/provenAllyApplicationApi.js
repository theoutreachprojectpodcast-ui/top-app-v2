const DIRECTORY_SOURCE = "nonprofits_search_app_v1";
const APPLICATION_TABLE = "proven_ally_applications";
const LOCAL_FALLBACK_KEY = "top_proven_ally_applications_demo";

export async function searchDirectoryOrganizations(supabase, term = "", limit = 20) {
  const q = String(term || "").trim();
  if (!supabase || q.length < 2) return [];
  const { data, error } = await supabase
    .from(DIRECTORY_SOURCE)
    .select("ein,org_name,city,state,website")
    .ilike("org_name", `%${q}%`)
    .limit(limit);
  if (error) throw error;
  return (data || []).map((r) => ({
    id: String(r.ein || "").trim(),
    ein: String(r.ein || "").trim(),
    name: String(r.org_name || "").trim(),
    city: String(r.city || "").trim(),
    state: String(r.state || "").trim(),
    website: String(r.website || "").trim(),
  }));
}

function pushLocalFallback(record) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    // ignore local fallback failures
  }
}

export async function submitProvenAllyApplication(supabase, payload) {
  const application = {
    ...payload,
    review_status: "submitted",
    application_fee_status: payload.application_fee_status || "unpaid",
    payment_demo_status: payload.payment_demo_status || "unpaid",
  };

  if (!supabase) {
    pushLocalFallback({ ...application, local_only: true, created_at: new Date().toISOString() });
    return { ok: true, localOnly: true };
  }

  const { error } = await supabase.from(APPLICATION_TABLE).insert(application);
  if (!error) return { ok: true, localOnly: false };

  // Keep demo usable if the table is not deployed yet.
  pushLocalFallback({
    ...application,
    local_only: true,
    created_at: new Date().toISOString(),
    supabase_error: error.message,
  });
  return {
    ok: true,
    localOnly: true,
    warning: "Application saved locally because the Supabase applications table is not yet deployed.",
  };
}

