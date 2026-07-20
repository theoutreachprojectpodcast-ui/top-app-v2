/** Canonical hub slugs for main-app mission partners (never podcast-only treatment). */
export const MAIN_APP_MISSION_PARTNER_SLUGS = new Set([
  "gameday-mens-health",
  "apex-global-outdoors",
  "rope-solutions",
]);

const MISSION_PARTNER_SLUG_ALIASES = {
  "game-day-mens-health": "gameday-mens-health",
};

export function canonicalMissionPartnerSlug(slug) {
  const key = String(slug || "").trim().toLowerCase();
  if (!key) return "";
  return MISSION_PARTNER_SLUG_ALIASES[key] || key;
}

export function isMainAppMissionPartnerSlug(slug) {
  const canonical = canonicalMissionPartnerSlug(slug);
  return canonical ? MAIN_APP_MISSION_PARTNER_SLUGS.has(canonical) : false;
}

/** Hub mission partners + ROPE — never podcast-scope treatment in the app. */
export function applyMainAppMissionPartnerCatalogDefaults(row = {}) {
  const canonical = canonicalMissionPartnerSlug(row.slug || row.id);
  if (!canonical || !MAIN_APP_MISSION_PARTNER_SLUGS.has(canonical)) return row;

  const next = { ...row, slug: canonical };
  if (!String(next.id || "").trim() || String(next.id).toLowerCase() === String(row.slug || "").toLowerCase()) {
    next.id = canonical;
  }

  next.sponsor_scope = "app";
  next.featured = true;

  if (canonical === "gameday-mens-health" || canonical === "apex-global-outdoors") {
    next.sponsor_type = "mission_partner_sponsor";
    next.sponsor_display_group = "mission_partner";
    next.primary_display_tag = "Mission Partner Sponsor";
    next.mission_partner = true;
  } else if (canonical === "rope-solutions") {
    next.sponsor_type = "foundational_sponsor";
    next.sponsor_display_group = "foundational";
    next.primary_display_tag = next.primary_display_tag || "Foundational Sponsor";
    next.mission_partner = true;
  }

  return next;
}
