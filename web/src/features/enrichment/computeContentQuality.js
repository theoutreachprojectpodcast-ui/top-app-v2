/**
 * Content quality scoring for organization records (nonprofit enrichment shape, trusted, sponsor).
 * Scores are heuristic (0..1); use for QA sorting, not legal assertions.
 */

function clamp01(n) {
  if (Number.isNaN(n) || n == null) return 0;
  return Math.max(0, Math.min(1, n));
}

/** @param {Record<string, unknown>} row - nonprofit_directory_enrichment-like */
export function computeNonprofitEnrichmentQuality(row) {
  if (!row || typeof row !== "object") {
    return { score: 0, flags: ["no_row"], missing: ["record"] };
  }
  const flags = [];
  const missing = [];

  const hasWebsite = !!String(row.website_url || "").trim();
  const hasShort = String(row.short_description || "").trim().length >= 40;
  const hasName = !!String(row.canonical_display_name || row.display_name_on_site || "").trim();
  const hasLogo = !!String(row.logo_url || "").trim();
  const hasHero = !!String(row.hero_image_url || row.header_image_url || "").trim();
  const socials = ["facebook_url", "instagram_url", "linkedin_url", "x_url", "youtube_url"].filter(
    (k) => !!String(row[k] || "").trim(),
  );

  if (!hasWebsite) {
    missing.push("website");
    flags.push("missing_website");
  }
  if (!hasShort) {
    missing.push("description");
    flags.push("weak_or_missing_description");
  }
  if (!hasName) {
    missing.push("display_name");
    flags.push("missing_display_name");
  }
  if (!hasLogo) {
    missing.push("logo");
    flags.push("missing_logo");
  }
  if (!hasHero) {
    missing.push("hero_or_header");
    flags.push("missing_hero_image");
  }
  if (socials.length === 0) flags.push("no_social_links");

  if (row.naming_review_required === true) flags.push("naming_review_required");
  if (String(row.research_status || "") === "verification_failed") flags.push("verification_failed");
  if (String(row.research_status || "") === "no_website") flags.push("no_website");

  let completeness =
    (hasWebsite ? 0.2 : 0) +
    (hasShort ? 0.2 : 0) +
    (hasName ? 0.15 : 0) +
    (hasLogo ? 0.15 : 0) +
    (hasHero ? 0.15 : 0) +
    (Math.min(socials.length, 3) / 3) * 0.15;

  const conf = row.research_confidence != null ? Number(row.research_confidence) : row.naming_confidence != null ? Number(row.naming_confidence) : 0.5;
  const confidence = clamp01(conf);

  const score = clamp01(completeness * 0.65 + confidence * 0.35);

  return { score, flags, missing, completeness: clamp01(completeness), confidence };
}

/** @param {Record<string, unknown>} row - trusted_resources row */
export function computeTrustedResourceQuality(row) {
  if (!row || typeof row !== "object") return { score: 0, flags: ["no_row"], missing: ["record"] };
  const flags = [];
  const missing = [];
  const hasName = !!String(row.display_name || "").trim();
  const hasSite = !!String(row.website_url || "").trim();
  const hasDesc = String(row.short_description || "").trim().length >= 30;
  const hasLogo = !!String(row.logo_url || "").trim();
  const hasHeader = !!String(row.header_image_url || "").trim();
  const socials = ["instagram_url", "facebook_url", "youtube_url", "x_url", "linkedin_url"].filter(
    (k) => !!String(row[k] || "").trim(),
  );

  if (!hasName) {
    missing.push("display_name");
    flags.push("missing_display_name");
  }
  if (!hasSite) {
    missing.push("website");
    flags.push("missing_website");
  }
  if (!hasDesc) flags.push("weak_or_missing_description");
  if (!hasLogo) flags.push("missing_logo");
  if (!hasHeader) flags.push("missing_header_image");
  if (socials.length === 0) flags.push("no_social_links");
  if (String(row.listing_status || "") !== "active") flags.push("not_active_listing");

  let completeness =
    (hasName ? 0.25 : 0) +
    (hasSite ? 0.2 : 0) +
    (hasDesc ? 0.2 : 0) +
    (hasLogo ? 0.15 : 0) +
    (hasHeader ? 0.1 : 0) +
    (Math.min(socials.length, 3) / 3) * 0.1;

  return { score: clamp01(completeness), flags, missing, completeness: clamp01(completeness), confidence: 0.7 };
}

/** @param {Record<string, unknown>} row - sponsors_catalog row */
export function computeSponsorCatalogQuality(row) {
  if (!row || typeof row !== "object") return { score: 0, flags: ["no_row"], missing: ["record"] };
  const flags = [];
  const missing = [];
  const hasName = !!String(row.name || "").trim();
  const hasSite = !!String(row.website_url || "").trim();
  const hasDesc = String(row.short_description || row.long_description || row.tagline || "").trim().length >= 24;
  const hasLogo = !!String(row.logo_url || "").trim();
  const hasBg = !!String(row.background_image_url || "").trim();
  const socials = ["instagram_url", "facebook_url", "linkedin_url", "twitter_url", "youtube_url"].filter(
    (k) => !!String(row[k] || "").trim(),
  );

  if (!hasName) {
    missing.push("name");
    flags.push("missing_name");
  }
  if (!hasSite) flags.push("missing_website");
  if (!hasDesc) flags.push("weak_or_missing_description");
  if (!hasLogo) flags.push("missing_logo");
  if (!hasBg) flags.push("missing_background");
  if (socials.length === 0) flags.push("no_social_links");

  let completeness =
    (hasName ? 0.25 : 0) +
    (hasSite ? 0.2 : 0) +
    (hasDesc ? 0.2 : 0) +
    (hasLogo ? 0.15 : 0) +
    (hasBg ? 0.1 : 0) +
    (Math.min(socials.length, 3) / 3) * 0.1;

  return { score: clamp01(completeness), flags, missing, completeness: clamp01(completeness), confidence: row.verified ? 0.85 : 0.55 };
}

/**
 * Promotion-ready: high score, no hard review flags.
 * @param {{ score: number, flags?: string[] }} q
 * @param {{ namingReviewRequired?: boolean, verified?: boolean }} opts
 */
export function isPromotionReady(q, opts = {}) {
  if (!q || q.score == null) return false;
  if (q.score < 0.72) return false;
  const flags = new Set(q.flags || []);
  if (flags.has("naming_review_required") || flags.has("verification_failed") || flags.has("no_website")) return false;
  if (opts.namingReviewRequired) return false;
  return true;
}

/** Trusted listing: same score bar; inactive listings never promote. */
export function isTrustedPromotionReady(q) {
  if (!q || q.score == null) return false;
  if (q.score < 0.72) return false;
  const flags = new Set(q.flags || []);
  if (flags.has("not_active_listing")) return false;
  return true;
}

/** Sponsors: verified catalog rows only; same score bar; block missing name. */
export function isSponsorPromotionReady(q, row) {
  if (!row?.verified) return false;
  if (!q || q.score == null) return false;
  if (q.score < 0.72) return false;
  const flags = new Set(q.flags || []);
  if (flags.has("missing_name")) return false;
  return true;
}
