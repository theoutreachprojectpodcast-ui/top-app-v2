import { SPONSOR_REVIEW_STATUSES } from "@/features/sponsors/admin/reviewStatuses";

const APPLICATION_TABLE = "sponsor_applications";
const LOCAL_FALLBACK_KEY = "top_sponsor_applications_demo";
const REVIEWABLE_STATUSES = new Set(SPONSOR_REVIEW_STATUSES);

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

function readLocalFallback() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocalFallback(list) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(Array.isArray(list) ? list.slice(0, 200) : []));
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

export async function listSponsorApplications(supabase) {
  if (!supabase) {
    return { ok: true, records: readLocalFallback(), localOnly: true };
  }
  const { data, error } = await supabase
    .from(APPLICATION_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { ok: true, records: readLocalFallback(), localOnly: true, warning: error.message };
  return { ok: true, records: Array.isArray(data) ? data : [], localOnly: false };
}

export async function updateSponsorApplicationReview(supabase, applicationId, status, internalNotes = "") {
  if (!applicationId || !REVIEWABLE_STATUSES.has(status)) {
    return { ok: false, error: "Invalid review update payload." };
  }

  if (!supabase) {
    const current = readLocalFallback();
    const next = current.map((row) =>
      String(row?.id || "") === String(applicationId)
        ? { ...row, application_status: status, internal_notes: String(internalNotes || ""), reviewed_at: new Date().toISOString() }
        : row,
    );
    writeLocalFallback(next);
    return { ok: true, localOnly: true };
  }

  const patch = {
    application_status: status,
    internal_notes: String(internalNotes || ""),
    reviewed_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(APPLICATION_TABLE).update(patch).eq("id", applicationId);
  if (!error) return { ok: true, localOnly: false };

  const current = readLocalFallback();
  const next = current.map((row) =>
    String(row?.id || "") === String(applicationId)
      ? { ...row, application_status: status, internal_notes: String(internalNotes || ""), reviewed_at: new Date().toISOString() }
      : row,
  );
  writeLocalFallback(next);
  return {
    ok: true,
    localOnly: true,
    warning: "Review state was saved locally because the Supabase table is unavailable in this environment.",
  };
}

