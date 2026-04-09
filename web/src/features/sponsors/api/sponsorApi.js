import { SPONSOR_REVIEW_STATUSES } from "@/features/sponsors/admin/reviewStatuses";

const APPLICATION_TABLE = "sponsor_applications";
const REVIEWABLE_STATUSES = new Set(SPONSOR_REVIEW_STATUSES);

/**
 * Submit sponsor application — server-side insert (applicants may be logged out).
 */
export async function submitSponsorApplication(_supabase, payload) {
  try {
    const res = await fetch("/api/sponsor-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, localOnly: false, id: json.id, inviteQueued: json.inviteQueued };
    }
    return {
      ok: false,
      error: json.error || json.message || `Submit failed (${res.status})`,
    };
  } catch {
    return { ok: false, error: "Network error while submitting application." };
  }
}

export async function listSponsorApplications(_supabase) {
  try {
    const res = await fetch("/api/admin/sponsor-applications", { credentials: "include" });
    if (res.status === 403 || res.status === 401) {
      return { ok: true, records: [], localOnly: false, forbidden: true };
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, records: [], error: json.error || "Could not load applications." };
    }
    return { ok: true, records: Array.isArray(json.records) ? json.records : [], localOnly: false };
  } catch {
    return { ok: false, records: [], error: "Network error." };
  }
}

export async function updateSponsorApplicationReview(_supabase, applicationId, status, internalNotes = "") {
  if (!applicationId || !REVIEWABLE_STATUSES.has(status)) {
    return { ok: false, error: "Invalid review update payload." };
  }

  try {
    const res = await fetch("/api/admin/sponsor-applications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: applicationId,
        application_status: status,
        internal_notes: String(internalNotes || ""),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json.error || "Review update failed." };
    }
    return { ok: true, localOnly: false };
  } catch {
    return { ok: false, error: "Network error." };
  }
}
