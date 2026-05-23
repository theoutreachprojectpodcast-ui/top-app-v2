/**
 * v0.8 — Public sponsors hub display tiers (stored on `sponsors_catalog.sponsor_display_group`).
 * Values are stable keys for admin/CMS and CSS; labels are user-facing section titles.
 */

/** @typedef {"mission_partner" | "foundational" | "impact" | "community"} SponsorDisplayGroupKey */

export const SPONSOR_DISPLAY_GROUP_ORDER = /** @type {const} */ ([
  "mission_partner",
  "foundational",
  "impact",
  "community",
]);

/** @type {Record<SponsorDisplayGroupKey, string>} */
export const SPONSOR_DISPLAY_GROUP_SECTION_TITLE = {
  mission_partner: "Mission Partner Sponsors",
  foundational: "Foundational Sponsors",
  impact: "Impact Sponsors",
  community: "Community Sponsors",
};

/** @type {Record<SponsorDisplayGroupKey, string>} */
export const SPONSOR_DISPLAY_GROUP_SECTION_LEAD = {
  mission_partner: "Premier mission-aligned partners with the broadest integrated presence across the platform.",
  foundational: "Core partners that anchor trust, training, and readiness across the ecosystem.",
  impact: "Regional and program sponsors extending reach into communities and verticals.",
  community: "Local and specialist partners — polished, credible, and mission-connected.",
};

const VALID = new Set(SPONSOR_DISPLAY_GROUP_ORDER);

/** Slug → group when DB column not set (bootstrap / seeds). */
const SLUG_DEFAULT_GROUP = /** @type {Record<string, SponsorDisplayGroupKey>} */ ({
  "apex-global-outdoors": "mission_partner",
  "gameday-mens-health": "mission_partner",
  "rope-solutions": "foundational",
  "the-veterans-veteran": "foundational",
  "iron-soldiers-coffee-company": "impact",
  "rucking-realty-group": "impact",
  "vetnav-services": "impact",
  "eduardo-pico-designs": "community",
  "green-gorilla-land-management": "community",
});

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {SponsorDisplayGroupKey}
 */
export function inferSponsorDisplayGroup(row) {
  const raw = String(row?.sponsor_display_group || row?.sponsorDisplayGroup || "")
    .trim()
    .toLowerCase();
  if (VALID.has(raw)) return /** @type {SponsorDisplayGroupKey} */ (raw);
  const slug = String(row?.slug || row?.id || "")
    .trim()
    .toLowerCase();
  if (slug && SLUG_DEFAULT_GROUP[slug]) return SLUG_DEFAULT_GROUP[slug];
  return "community";
}

/**
 * @param {Record<string, unknown>[]} rows normalized or raw catalog rows
 * @returns {Record<SponsorDisplayGroupKey, Record<string, unknown>[]>}
 */
export function groupSponsorsByDisplayTier(rows = []) {
  /** @type {Record<SponsorDisplayGroupKey, Record<string, unknown>[]>} */
  const out = {
    mission_partner: [],
    foundational: [],
    impact: [],
    community: [],
  };
  const seen = new Set();
  for (const r of rows) {
    const slug = String(r?.slug || r?.id || "")
      .trim()
      .toLowerCase();
    if (slug && seen.has(slug)) continue;
    if (slug) seen.add(slug);
    const g = inferSponsorDisplayGroup(r);
    out[g].push(r);
  }
  const sortFn = (a, b) => {
    const da = Number(a?.display_order ?? a?.displayOrder ?? 0);
    const db = Number(b?.display_order ?? b?.displayOrder ?? 0);
    if (da !== db) return da - db;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  };
  for (const k of SPONSOR_DISPLAY_GROUP_ORDER) out[k].sort(sortFn);
  return out;
}
