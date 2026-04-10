import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

/**
 * Merge optional nonprofit_directory_enrichment row onto a raw directory view row.
 * When an enrichment row exists, social URLs are only passed through for platforms marked verified.
 * Without an enrichment row, directory social icons stay hidden (strict) — website remains available from the base row.
 */
export function mergeDirectoryRowWithEnrichment(row = {}, enrichment) {
  if (!enrichment || typeof enrichment !== "object") return row;
  const e = enrichment;

  const pickVerifiedUrl = (verified, enrichedUrl, ...fallbacks) => {
    if (!verified) return "";
    return firstText(enrichedUrl, ...fallbacks);
  };

  return {
    ...row,
    website: firstText(e.website_url, row.website, row.Website),
    headline: firstText(e.headline, row.headline),
    tagline: firstText(e.tagline, row.tagline),
    short_description: firstText(e.short_description, row.short_description, row.description),
    long_description: firstText(e.long_description, row.long_description),
    mission_statement: firstText(e.mission_statement, row.mission_statement),
    service_area: firstText(e.service_area, row.service_area),
    founded_year: e.founded_year ?? row.founded_year ?? null,
    hero_image_url: firstText(e.hero_image_url, row.hero_image_url),
    thumbnail_url: firstText(e.thumbnail_url, row.thumbnail_url),

    header_image_url: firstText(e.header_image_url, row.header_image_url),
    header_image_source_url: firstText(e.header_image_source_url, row.header_image_source_url),
    header_image_source_type: firstText(e.header_image_source_type, row.header_image_source_type),
    header_image_status: firstText(e.header_image_status, row.header_image_status),
    header_image_last_enriched_at: e.header_image_last_enriched_at ?? row.header_image_last_enriched_at ?? null,
    header_image_review_status: firstText(e.header_image_review_status, row.header_image_review_status),
    header_image_notes: firstText(e.header_image_notes, row.header_image_notes),
    public_slug: firstText(e.public_slug, row.public_slug),
    metadata_source: firstText(e.metadata_source, row.metadata_source),
    profile_enriched_at: e.profile_enriched_at ?? row.profile_enriched_at,
    last_verified_at: e.last_verified_at ?? row.last_verified_at,

    logo_url: firstText(e.logo_url, row.logo_url, row.logoUrl),

    facebook_url: pickVerifiedUrl(!!e.facebook_verified, e.facebook_url, row.facebook_url, row.facebook),
    facebook_verified: !!e.facebook_verified,
    instagram_url: pickVerifiedUrl(!!e.instagram_verified, e.instagram_url, row.instagram_url, row.instagram),
    instagram_verified: !!e.instagram_verified,
    linkedin_url: pickVerifiedUrl(!!e.linkedin_verified, e.linkedin_url, row.linkedin_url, row.linkedin),
    linkedin_verified: !!e.linkedin_verified,
    x_url: pickVerifiedUrl(!!e.x_verified, e.x_url, row.x_url, row.twitter),
    x_verified: !!e.x_verified,
    youtube_url: pickVerifiedUrl(!!e.youtube_verified, e.youtube_url, row.youtube_url, row.youtube),
    youtube_verified: !!e.youtube_verified,
    tiktok_url: pickVerifiedUrl(!!e.tiktok_verified, e.tiktok_url, row.tiktok_url),
    tiktok_verified: !!e.tiktok_verified,

    ein_identity_verified: e.ein_identity_verified !== false && row.ein_identity_verified !== false,
    identity_verified_at: e.identity_verified_at ?? row.identity_verified_at ?? null,

    display_name_on_site: firstText(e.display_name_on_site, row.display_name_on_site),
    canonical_display_name: firstText(e.canonical_display_name, row.canonical_display_name),
    website_verified_name: firstText(e.website_verified_name, row.website_verified_name),
    irs_name: firstText(e.irs_name, row.irs_name),
    legal_name: firstText(e.legal_name, row.legal_name),
    naming_confidence: e.naming_confidence ?? row.naming_confidence ?? null,
    naming_source_summary: firstText(e.naming_source_summary, row.naming_source_summary),
    naming_status: firstText(e.naming_status, row.naming_status),
    naming_last_checked_at: e.naming_last_checked_at ?? row.naming_last_checked_at ?? null,
    naming_verified_at: e.naming_verified_at ?? row.naming_verified_at ?? null,
    naming_review_required: !!(e.naming_review_required ?? row.naming_review_required),
    research_status: firstText(e.research_status, row.research_status),
    research_confidence: e.research_confidence ?? row.research_confidence ?? null,
    source_summary: firstText(e.source_summary, row.source_summary),
    web_search_supplemented: !!(e.web_search_supplemented ?? row.web_search_supplemented),

    _enrichment: {
      ein: normalizeEinDigits(e.ein || row.ein),
      merged: true,
    },
  };
}

function firstText(...vals) {
  for (const v of vals) {
    const t = String(v ?? "").trim();
    if (t) return t;
  }
  return "";
}

export function enrichmentRowsByEin(rows = []) {
  const map = new Map();
  for (const r of rows) {
    const key = normalizeEinDigits(r?.ein);
    if (key.length === 9) map.set(key, r);
  }
  return map;
}
