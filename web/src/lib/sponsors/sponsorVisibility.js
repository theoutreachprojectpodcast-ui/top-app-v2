/**
 * Public sponsor visibility and publish-state helpers.
 */

export function normalizePublishStatus(value) {
  const s = String(value || "published").trim().toLowerCase();
  if (s === "draft" || s === "archived") return s;
  return "published";
}

/** True when a catalog row may appear on public sponsor surfaces. */
export function isPublicSponsorRow(row) {
  if (!row) return false;
  const active = row.is_active == null ? true : !!row.is_active;
  if (!active) return false;
  return normalizePublishStatus(row.publish_status) === "published";
}

/** Prefer curated enrichment text over catalog / scraped values. */
export function preferCuratedField(catalogValue, curatedValue) {
  const curated = String(curatedValue ?? "").trim();
  if (curated) return curated;
  return String(catalogValue ?? "").trim();
}
