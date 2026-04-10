/**
 * Resolve which header/hero image URL to show on nonprofit + trusted resource listing cards.
 * Uses only fields already on the row — no network access.
 *
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
export function resolveOrgListingHeaderImageUrl(row = {}) {
  const headerUrl = String(row.header_image_url ?? row.headerImageUrl ?? "").trim();
  const status = String(row.header_image_status ?? row.headerImageStatus ?? "").trim().toLowerCase();
  const review = String(row.header_image_review_status ?? row.headerImageReviewStatus ?? "")
    .trim()
    .toLowerCase();

  const rejected = status === "rejected" || review === "rejected";
  if (headerUrl && !rejected) {
    const allowedStatus =
      !status ||
      status === "pending" ||
      status === "found" ||
      status === "approved" ||
      status === "fallback" ||
      status === "curated";
    const allowedReview =
      !review || review === "pending_review" || review === "approved" || review === "curated";
    if (allowedStatus && allowedReview) return headerUrl;
  }

  const legacyHero = String(row.hero_image_url ?? row.heroImageUrl ?? "").trim();
  if (legacyHero && !rejected) return legacyHero;

  return String(row.thumbnail_url ?? row.thumbnailUrl ?? "").trim();
}
