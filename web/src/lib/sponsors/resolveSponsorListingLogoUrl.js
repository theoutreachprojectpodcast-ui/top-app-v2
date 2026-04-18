/**
 * Which logo URL to show on sponsor cards/profile (DB fields only — no network I/O).
 *
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
export function resolveSponsorListingLogoUrl(row = {}) {
  const url = String(row.logo_url ?? row.logoUrl ?? "").trim();
  const status = String(row.logo_status ?? row.logoStatus ?? "").trim().toLowerCase();
  const review = String(row.logo_review_status ?? row.logoReviewStatus ?? "").trim().toLowerCase();

  const rejected = status === "rejected" || review === "rejected";
  if (rejected) return "";

  if (url) {
    const allowedStatus =
      !status ||
      status === "pending" ||
      status === "found" ||
      status === "approved" ||
      status === "fallback" ||
      status === "curated";
    const allowedReview =
      !review || review === "pending_review" || review === "approved" || review === "curated";
    if (allowedStatus && allowedReview) return url;
  }

  return "";
}
