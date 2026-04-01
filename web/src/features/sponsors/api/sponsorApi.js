const APPLICATION_TABLE = "sponsor_applications";
const LOCAL_FALLBACK_KEY = "top_sponsor_applications_demo";

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

export async function submitSponsorApplication(supabase, payload) {
  const application = {
    ...payload,
    application_status: payload.application_status || "submitted",
    payment_status: payload.payment_status || "unpaid",
    payment_demo_status: payload.payment_demo_status || "unpaid",
  };

  if (!supabase) {
    pushLocalFallback({ ...application, local_only: true, created_at: new Date().toISOString() });
    return { ok: true, localOnly: true };
  }

  const { error } = await supabase.from(APPLICATION_TABLE).insert(application);
  if (!error) return { ok: true, localOnly: false };

  pushLocalFallback({
    ...application,
    local_only: true,
    created_at: new Date().toISOString(),
    supabase_error: error.message,
  });
  return {
    ok: true,
    localOnly: true,
    warning: "Sponsor application saved locally because the Supabase table is not yet deployed.",
  };
}

