/**
 * Shared directory filter + count-retry helpers (no path aliases — safe for Node tests).
 */

export function applyDirectoryFilters(query, filters, { includePublicStatus = true } = {}) {
  let q = query.eq("state", filters.state);

  // Public directory: approved rows, or legacy rows with NULL status.
  // Pending / hidden / rejected IRS imports stay out of member search.
  if (includePublicStatus) {
    q = q.or("directory_status.eq.approved,directory_status.is.null");
  }

  if ((filters.q || "").trim()) {
    const term = String(filters.q).replace(/,/g, " ").trim();
    q = q.or(`org_name.ilike.%${term}%,city.ilike.%${term}%`);
  }

  if (filters.service) q = q.ilike("ntee_code", `${filters.service}%`);
  if (filters.audience === "veteran") q = q.eq("serves_veterans", true);
  if (filters.audience === "first_responder") q = q.eq("serves_first_responders", true);
  if (filters.irsSubsection) q = q.eq("irs_subsection", String(filters.irsSubsection));

  return q;
}

export function isMissingDirectoryStatusColumn(error) {
  const msg = String(error?.message || "");
  return /directory_status/i.test(msg) && (/does not exist|schema cache|Could not find/i.test(msg));
}

/**
 * PostgREST HEAD count requests often return status 400 with an empty error.message
 * when a filter references a missing column (e.g. directory_status on older MVs).
 * Page GETs still return a useful message — count must detect this separately.
 */
export function shouldRetryDirectoryWithoutStatus(result, { attemptedWithStatus = true } = {}) {
  if (!attemptedWithStatus) return false;
  if (isMissingDirectoryStatusColumn(result?.error)) return true;
  const status = Number(result?.status) || 0;
  const msg = String(result?.error?.message || "").trim();
  if (typeof result?.count === "number") return false;
  // Auth failures should not be masked by dropping the status filter.
  if (status === 401 || status === 403) return false;
  if (status === 400 && (!msg || /directory_status/i.test(msg))) return true;
  if (result?.error && !msg) return true;
  return false;
}
