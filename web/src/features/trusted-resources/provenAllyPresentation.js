/**
 * Proven Allies presentation: canonical registry (EIN + strict name match) + universal enrichment + category fallback.
 */

import {
  formatOrganizationDisplayName,
  isPlaceholderOrgName,
  normalizeOrganizationWhitespace,
} from "@/lib/formatOrgName";
import { safeUrl } from "@/lib/utils";
import { mapNonprofitCategory, NONPROFIT_CATEGORY_MAP } from "@/features/nonprofits/mappers/categoryMapper";
import { matchCanonicalProvenAlly } from "@/features/trusted-resources/provenAllyRegistry";

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function firstNonEmptySkipPlaceholder(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text || isPlaceholderOrgName(text)) continue;
    return text;
  }
  return "";
}

function applyCanonicalRecord(row, record) {
  const next = { ...row };
  next.canonicalDisplayName = record.displayName;
  next.orgName = record.displayName;
  next.provenAllySlug = record.slug;
  next.provenDisplayLocation = record.locationLabel;
  next.city = "";
  next.state = "";
  if (record.website) next.website = record.website;
  if (record.ntee_code) {
    next.ntee_code = record.ntee_code;
    next.nteeCode = record.ntee_code;
  }
  if (record.nonprofit_type) next.nonprofit_type = record.nonprofit_type;
  if (record.shortDescription) next.description = record.shortDescription;
  if (record.provenCategoryKey && NONPROFIT_CATEGORY_MAP[record.provenCategoryKey]) {
    next.provenCategoryKey = record.provenCategoryKey;
  }

  if (record.socialOverrides) {
    const o = record.socialOverrides;
    if (o.instagramUrl) {
      next.instagramUrl = o.instagramUrl;
      next.instagram_url = o.instagramUrl;
    }
    if (o.facebookUrl) {
      next.facebookUrl = o.facebookUrl;
      next.facebook_url = o.facebookUrl;
    }
    if (o.youtubeUrl) {
      next.youtubeUrl = o.youtubeUrl;
      next.youtube_url = o.youtubeUrl;
    }
    if (o.xUrl) {
      next.xUrl = o.xUrl;
      next.x_url = o.xUrl;
    }
    if (o.linkedinUrl) {
      next.linkedinUrl = o.linkedinUrl;
      next.linkedin_url = o.linkedinUrl;
    }
  }

  if (record.clearUnlistedSocials && record.socialOverrides) {
    const o = record.socialOverrides;
    if (!o.facebookUrl) {
      next.facebookUrl = "";
      next.facebook_url = "";
    }
    if (!o.instagramUrl) {
      next.instagramUrl = "";
      next.instagram_url = "";
    }
    if (!o.youtubeUrl) {
      next.youtubeUrl = "";
      next.youtube_url = "";
    }
    if (!o.xUrl) {
      next.xUrl = "";
      next.x_url = "";
    }
    if (!o.linkedinUrl) {
      next.linkedinUrl = "";
      next.linkedin_url = "";
    }
  }

  return next;
}

function applyRegistryCanonical(row) {
  const record = matchCanonicalProvenAlly(row);
  if (!record) return { ...row };
  return applyCanonicalRecord(row, record);
}

/**
 * Applied to every proven ally after optional canonical match:
 * - Humanized display name when not registry-backed
 * - Normalize website URL
 * - Backfill nonprofit_type for category mapping
 * - Default location label when geography is missing
 */
function applyUniversalTrustedEnrichment(row) {
  const next = { ...row };
  const profile = next.raw?.profile || {};
  const org = next.raw?.org || {};
  const useCanonicalName = !!next.canonicalDisplayName;

  if (useCanonicalName) {
    // Registry displayName is hand-reviewed; never run title-case formatter (it can mangle USA, For, etc.).
    next.orgName = normalizeOrganizationWhitespace(next.canonicalDisplayName);
  } else {
    const rawName = firstNonEmptySkipPlaceholder(
      next.orgName,
      profile.display_name_override,
      profile.organization_name,
      profile.legal_name,
      org.org_name,
      org.organization_name,
      org.name,
      org.NAME,
      profile.title,
      profile.org_name,
      profile.name
    );
    if (rawName) {
      next.orgName = formatOrganizationDisplayName(rawName);
    } else {
      next.orgName = "";
    }
  }

  const webCandidate = firstNonEmpty(next.website, profile.website, org.website, org.Website);
  const normalizedWeb = safeUrl(webCandidate);
  if (normalizedWeb) {
    next.website = normalizedWeb;
  }

  const existingType = String(next.nonprofit_type || profile.nonprofit_type || "").trim();
  if (!existingType) {
    const inferred = firstNonEmpty(
      profile.nonprofit_type,
      profile.category,
      profile.organization_type,
      profile.who_you_serve,
      profile.services_offered,
      profile.description
    );
    if (inferred) {
      next.nonprofit_type = inferred.length > 280 ? `${inferred.slice(0, 277)}…` : inferred;
    }
  }

  if (!next.description) {
    const desc = firstNonEmpty(
      profile.description,
      profile.services_offered,
      profile.who_you_serve,
      org.description
    );
    if (desc) {
      next.description = desc.length > 360 ? `${desc.slice(0, 357)}…` : desc;
    }
  }

  if (!next.provenDisplayLocation) {
    const city = firstNonEmpty(
      next.city,
      org.city,
      org.CITY,
      profile.city,
      profile.address_city,
      profile.headquarters_city
    );
    const state = firstNonEmpty(
      next.state,
      org.state,
      org.STATE,
      profile.state,
      profile.address_state,
      profile.headquarters_state
    );
    const locBlob = firstNonEmpty(
      profile.location,
      profile.headquarters_location,
      profile.primary_location,
      profile.service_area,
      profile.city_state,
      profile.cityState
    );

    if (city || state) {
      next.provenDisplayLocation = [city, state].filter(Boolean).join(", ");
      return next;
    }

    if (locBlob) {
      if (/\b(nationwide|national\s+(headquarters|organization|reach)|across\s+the\s+(u\.?s\.?|united\s+states)|all\s+50)\b/i.test(locBlob)) {
        next.provenDisplayLocation = "National";
      }
      return next;
    }

    const missionText = `${profile.description || ""} ${profile.who_you_serve || ""} ${profile.services_offered || ""}`.toLowerCase();
    if (
      /\b(nationwide|national\s+(headquarters|organization|reach)|across\s+the\s+(u\.?s\.?|united\s+states)|all\s+50\s+states|throughout\s+the\s+country)\b/.test(
        missionText
      )
    ) {
      next.provenDisplayLocation = "National";
    } else {
      next.provenDisplayLocation = "United States";
    }
  }

  return next;
}

function assignProvenCategoryFallback(row) {
  const next = { ...row };
  if (next.provenCategoryKey && NONPROFIT_CATEGORY_MAP[next.provenCategoryKey]) {
    return next;
  }

  const mapped = mapNonprofitCategory(next);
  if (mapped.key !== "unknownGeneral") {
    next.provenCategoryKey = mapped.key;
    return next;
  }

  const blob = `${next.nonprofit_type || ""} ${next.description || ""} ${next.orgName || ""}`.toLowerCase();
  if (/veteran|military|troop|service\s*member|warrior|armed\s*forces|gold\s*star|combat/.test(blob)) {
    next.provenCategoryKey = "veteransMilitary";
  } else if (/first\s*responder|firefighter|police|ems|disaster|emergency\s*response/.test(blob)) {
    next.provenCategoryKey = "firstRespondersSafety";
  } else if (/mental\s*health|wellness|counseling|therapy|ptsd/.test(blob)) {
    next.provenCategoryKey = "healthWellness";
  } else if (/housing|home|shelter|mortgage/.test(blob)) {
    next.provenCategoryKey = "humanServices";
  } else if (/scholarship|education|school|college/.test(blob)) {
    next.provenCategoryKey = "education";
  } else if (/career|employment|job|workforce/.test(blob)) {
    next.provenCategoryKey = "education";
  } else {
    next.provenCategoryKey = "veteransMilitary";
  }
  return next;
}

function cloneTrustedRowShallow(row) {
  const next = { ...row };
  if (row.raw && typeof row.raw === "object") {
    next.raw = { ...row.raw };
    if (row.raw.profile && typeof row.raw.profile === "object") {
      next.raw.profile = { ...row.raw.profile };
    }
    if (row.raw.org && typeof row.raw.org === "object") {
      next.raw.org = { ...row.raw.org };
    }
  }
  return next;
}

export function mergeProvenAllyPresentation(row = {}) {
  if (!row || typeof row !== "object") return row;
  const isolated = cloneTrustedRowShallow(row);
  let next = applyRegistryCanonical(isolated);
  next = applyUniversalTrustedEnrichment(next);
  // Second pass: real names often appear only after skipping placeholders + normalized website URLs.
  if (!next.canonicalDisplayName) {
    next = applyRegistryCanonical(next);
    next = applyUniversalTrustedEnrichment(next);
  }
  return assignProvenCategoryFallback(next);
}
