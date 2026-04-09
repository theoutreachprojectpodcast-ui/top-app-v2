import { sanitizeOrganizationNameForDisplay } from "@/lib/entityDisplayName";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function parseLocation(location = "") {
  const raw = String(location || "").trim();
  if (!raw) return { city: "", state: "" };

  const parts = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts[0] || "",
      state: parts[1] || "",
    };
  }

  // Fallback for "City ST" patterns when comma is not present.
  const compact = raw.replace(/\s+/g, " ").trim();
  const stateAbbrev = compact.match(/^(.*)\s+([A-Z]{2})$/);
  if (stateAbbrev) {
    return {
      city: String(stateAbbrev[1] || "").trim(),
      state: String(stateAbbrev[2] || "").trim(),
    };
  }

  return {
    city: compact,
    state: "",
  };
}

export function mapDirectoryRow(row = {}) {
  const einRaw = String(row.ein ?? row.EIN ?? "").trim();
  const einNorm = normalizeEinDigits(einRaw);
  const identityOk = einNorm.length === 9 && row.ein_identity_verified !== false;
  return {
    ein: einRaw,
    einNormalized: einNorm,
    einIdentityVerified: identityOk,
    identityVerifiedAt: row.identity_verified_at ?? null,
    orgName: String(
      row.canonical_display_name ??
      row.display_name ??
      row.org_name ??
      row.organization_name ??
      row.name ??
      row.NAME ??
      "Unknown Organization"
    ).trim(),
    city: String(row.city ?? row.CITY ?? "").trim(),
    state: String(row.state ?? row.STATE ?? "").trim(),
    nteeCode: String(row.ntee_code ?? row.ntee ?? row.NTEE_CODE ?? "").trim(),
    servesVeterans: !!row.serves_veterans,
    servesFirstResponders: !!row.serves_first_responders,
    isTrusted: !!(row.is_trusted ?? row.trusted ?? false),
    website: row.website ?? row.Website ?? "",
    logoUrl: row.logo_url ?? row.logoUrl ?? row.logo ?? "",
    cityImageUrl: row.fallback_city_image_url ?? row.city_image_url ?? row.cityImageUrl ?? "",
    verificationTier: row.verification_tier ?? row.verificationTier ?? "",
    verificationSource: row.verification_source ?? row.verificationSource ?? "",
    instagramUrl: row.instagram_url ?? row.instagram ?? "",
    facebookUrl: row.facebook_url ?? row.facebook ?? "",
    youtubeUrl: row.youtube_url ?? row.youtube ?? "",
    xUrl: row.x_url ?? row.twitter ?? "",
    linkedinUrl: row.linkedin_url ?? row.linkedin ?? "",
    tiktokUrl: row.tiktok_url ?? row.tiktok ?? "",
    headline: String(row.headline ?? "").trim(),
    tagline: String(row.tagline ?? "").trim(),
    shortDescription: String(row.short_description ?? "").trim(),
    longDescription: String(row.long_description ?? "").trim(),
    missionStatement: String(row.mission_statement ?? "").trim(),
    serviceArea: String(row.service_area ?? "").trim(),
    foundedYear: row.founded_year ?? null,
    heroImageUrl: String(row.hero_image_url ?? "").trim(),
    thumbnailUrl: String(row.thumbnail_url ?? "").trim(),
    publicSlug: String(row.public_slug ?? "").trim(),
    metadataSource: String(row.metadata_source ?? "").trim(),
    profileEnrichedAt: row.profile_enriched_at ?? null,
    lastVerifiedAt: row.last_verified_at ?? null,
    facebookVerified: !!row.facebook_verified,
    instagramVerified: !!row.instagram_verified,
    linkedinVerified: !!row.linkedin_verified,
    xVerified: !!row.x_verified,
    youtubeVerified: !!row.youtube_verified,
    tiktokVerified: !!row.tiktok_verified,
    displayNameOnSite: String(row.display_name_on_site ?? "").trim(),
    canonicalDisplayName: String(row.canonical_display_name ?? "").trim(),
    websiteVerifiedName: String(row.website_verified_name ?? "").trim(),
    irsName: String(row.irs_name ?? "").trim(),
    legalName: String(row.legal_name ?? "").trim(),
    namingConfidence: row.naming_confidence ?? null,
    namingSourceSummary: String(row.naming_source_summary ?? "").trim(),
    namingStatus: String(row.naming_status ?? "").trim(),
    namingLastCheckedAt: row.naming_last_checked_at ?? null,
    namingVerifiedAt: row.naming_verified_at ?? null,
    namingReviewRequired: !!row.naming_review_required,
    researchStatus: String(row.research_status ?? "").trim(),
    researchConfidence: row.research_confidence ?? null,
    sourceSummary: String(row.source_summary ?? "").trim(),
    webSearchSupplemented: !!row.web_search_supplemented,
    raw: row,
  };
}

export function mapTrustedRow(profile = {}, org = {}) {
  const website = firstNonEmpty(profile.website, org.website);
  const parsedProfileLocation = parseLocation(profile.location || profile.city_state || profile.cityState || "");
  const city = firstNonEmpty(org.city, profile.city, profile.address_city, parsedProfileLocation.city);
  const state = firstNonEmpty(org.state, profile.state, profile.address_state, parsedProfileLocation.state);
  const nonprofitType = firstNonEmpty(profile.nonprofit_type, org.nonprofit_type, profile.category, profile.organization_type);
  const supportText = String(
    firstNonEmpty(
      profile.who_you_serve,
      profile.services_offered,
      profile.veteran_support_experience,
      profile.first_responder_support_experience
    )
  ).toLowerCase();
  return {
    ein: String(profile.ein ?? org.ein ?? "").trim(),
    // Do not use website hostname as a title. Leave empty when no real name so enrichment/registry
    // can read profile/org fields instead of locking onto "Unknown Organization".
    orgName: (() => {
      const rawTitle = firstNonEmpty(
        profile.display_name_override,
        profile.organization_name,
        profile.legal_name,
        profile.org_name,
        profile.name,
        org.organization_name,
        org.org_name,
        org.name,
        org.NAME
      );
      return rawTitle ? sanitizeOrganizationNameForDisplay(rawTitle, { trustCanonical: false }) : "";
    })(),
    city: String(city).trim(),
    state: String(state).trim(),
    nteeCode: String(firstNonEmpty(org.ntee_code, profile.ntee_code)).trim(),
    nonprofit_type: nonprofitType,
    serves_veterans: supportText.includes("veteran"),
    serves_first_responders: supportText.includes("first responder"),
    isTrusted: true,
    website,
    logoUrl: profile.logo_url ?? org.logo_url ?? "",
    cityImageUrl: profile.fallback_city_image_url ?? org.fallback_city_image_url ?? "",
    verificationTier: profile.verification_tier ?? org.verification_tier ?? "featured",
    verificationSource: profile.verification_source ?? org.verification_source ?? "trusted_profile",
    instagramUrl: firstNonEmpty(profile.instagram_url, org.instagram_url),
    facebookUrl: firstNonEmpty(profile.facebook_url, org.facebook_url),
    youtubeUrl: firstNonEmpty(profile.youtube_url, org.youtube_url),
    xUrl: firstNonEmpty(profile.x_url, org.x_url),
    linkedinUrl: firstNonEmpty(profile.linkedin_url, org.linkedin_url),
    description: firstNonEmpty(
      profile.description,
      profile.services_offered,
      profile.who_you_serve,
      org.description
    ),
    raw: { profile, org },
  };
}
