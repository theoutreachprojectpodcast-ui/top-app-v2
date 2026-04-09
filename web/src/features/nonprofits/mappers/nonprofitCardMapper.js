import { mapNonprofitCategory } from "@/features/nonprofits/mappers/categoryMapper";
import { getNonprofitVerificationTier } from "@/lib/nonprofits/verification";
import { mapNonprofitStatus } from "@/features/nonprofits/mappers/nonprofitStatusMapper";
import { mergeTrustedResourcesPresentation } from "@/features/trusted-resources/provenAllyPresentation";
import { isPlaceholderOrgName } from "@/lib/formatOrgName";
import { resolveCanonicalOrganizationName } from "@/lib/entityDisplayName";
import { rowCity, rowEin, rowNtee, rowState } from "@/lib/utils";
import { nteeToService } from "@/lib/utils";
import { mapNonprofitLinks } from "@/features/nonprofits/mappers/nonprofitLinksMapper";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { resolveFindInfoHref } from "@/features/nonprofits/domain/nonprofitCardActions";

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

/** safeText uses "—" for empty; skip that so we can fall through to profile/org fields */
function firstNonEmptyDisplay(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && text !== "—") return text;
  }
  return "";
}

/** Priority-ordered raw strings for resolving a public title (no job titles / profile.title). */
function gatherOrganizationTitleCandidates(baseRow, profile, orgRaw) {
  const raw = [
    baseRow.displayName,
    baseRow.display_name,
    baseRow.verified_name,
    baseRow.verifiedName,
    baseRow.approved_name,
    baseRow.approvedName,
    baseRow.orgName,
    baseRow.catalog_display_name,
    baseRow.display_name_on_site,
    baseRow.displayNameOnSite,
    baseRow.canonical_display_name,
    baseRow.canonicalDisplayName,
    baseRow.website_verified_name,
    baseRow.websiteVerifiedName,
    baseRow.verified_name,
    baseRow.approved_name,
    baseRow.org_name,
    baseRow.name,
    baseRow.NAME,
    baseRow.display_name_override,
    baseRow.organization_name,
    baseRow.legal_name,
    orgRaw.organization_name,
    orgRaw.org_name,
    orgRaw.name,
    orgRaw.NAME,
    profile.display_name_override,
    profile.verified_name,
    profile.approved_name,
    profile.organization_name,
    profile.legal_name,
    profile.org_name,
    profile.name,
  ];
  const seen = new Set();
  const out = [];
  for (const value of raw) {
    const text = String(value ?? "").trim();
    if (!text || text === "—" || isPlaceholderOrgName(text)) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

/** Curated + universal Trusted Resources formatting whenever the row is a catalog listing, not only on the trusted tab */
function needsTrustedResourcesPresentation(row = {}, source) {
  if (source === "trusted") return true;
  if (row?.isTrusted || row?.is_trusted) return true;
  const prof = row?.raw?.profile;
  if (prof?.is_trusted === true || prof?.is_proven_ally === true) return true;
  if (String(prof?.proven_ally_status || "").toLowerCase() === "approved") return true;
  const rawRow = row?.raw;
  if (rawRow && typeof rawRow === "object" && !prof) {
    if (rawRow.is_trusted === true || rawRow.is_proven_ally === true) return true;
  }
  return false;
}

function parseLocation(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return { city: "", state: "" };
  const comma = raw.split(",").map((x) => x.trim()).filter(Boolean);
  if (comma.length >= 2) return { city: comma[0], state: comma[1] };
  const compact = raw.replace(/\s+/g, " ");
  const match = compact.match(/^(.*)\s+([A-Z]{2})$/);
  if (match) return { city: match[1].trim(), state: match[2].trim() };
  return { city: compact, state: "" };
}

function resolveTrustedLocation(row = {}, profile = {}) {
  const directCity = firstNonEmpty(
    row.city,
    row.address_city,
    profile.city,
    profile.address_city,
    profile.headquarters_city,
    profile.service_city
  );
  const directState = firstNonEmpty(
    row.state,
    row.address_state,
    profile.state,
    profile.address_state,
    profile.headquarters_state,
    profile.service_state
  );
  if (directCity || directState) {
    return { city: directCity, state: directState, raw: "" };
  }

  const rawLocation = firstNonEmpty(
    row.location,
    profile.location,
    profile.city_state,
    profile.cityState,
    profile.headquarters_location,
    profile.headquarters,
    profile.primary_location,
    profile.service_area
  );
  const parsed = parseLocation(rawLocation);
  return { city: parsed.city, state: parsed.state, raw: rawLocation };
}

export function mapNonprofitCardRow(row = {}, source = "directory") {
  const applyTrustedPresentation = needsTrustedResourcesPresentation(row, source);
  const baseRow = applyTrustedPresentation ? mergeTrustedResourcesPresentation(row) : row;
  const profile = baseRow?.raw?.profile || {};
  const trustedLocation = resolveTrustedLocation(baseRow, profile);
  const resolvedCity = firstNonEmpty(
    baseRow.city,
    rowCity(baseRow),
    baseRow.address_city,
    profile.city,
    profile.address_city,
    trustedLocation.city
  );
  const resolvedState = firstNonEmpty(
    baseRow.state,
    rowState(baseRow),
    baseRow.address_state,
    profile.state,
    profile.address_state,
    trustedLocation.state
  );
  const orgRaw = baseRow.raw?.org || {};
  const titleCandidates = gatherOrganizationTitleCandidates(baseRow, profile, orgRaw);
  const websiteForTitle = firstNonEmpty(baseRow.website, profile.website, orgRaw.website, orgRaw.Website);
  const displayName = resolveCanonicalOrganizationName({
    trustCanonical: !!baseRow.canonicalDisplayName,
    canonicalDisplayName: baseRow.canonicalDisplayName,
    candidateNames: titleCandidates,
    trustedResourceSlug: baseRow.trustedResourceSlug,
    provenAllySlug: baseRow.provenAllySlug,
    websiteUrl: websiteForTitle,
    emptyFallback: source === "saved" ? "Saved organization" : "Organization",
  });

  const patchedRow = {
    ...baseRow,
    orgName: displayName,
    provenCategoryKey: baseRow.provenCategoryKey,
    city: resolvedCity,
    state: resolvedState,
    nonprofit_type: firstNonEmpty(
      baseRow.nonprofit_type,
      baseRow.nonprofitType,
      profile.nonprofit_type,
      profile.category,
      profile.organization_type
    ),
    serves_veterans:
      baseRow.serves_veterans ??
      baseRow.servesVeterans ??
      String(firstNonEmpty(profile.who_you_serve, profile.veteran_support_experience)).toLowerCase().includes("veteran"),
    serves_first_responders:
      baseRow.serves_first_responders ??
      baseRow.servesFirstResponders ??
      String(firstNonEmpty(profile.who_you_serve, profile.first_responder_support_experience)).toLowerCase().includes("first responder"),
    ntee_code: firstNonEmpty(
      baseRow.ntee_code,
      baseRow.nteeCode,
      profile.ntee_code,
      profile.ntee,
      profile.category_code,
      profile.nonprofit_type
    ),
  };

  const category = mapNonprofitCategory(patchedRow);
  const tier = getNonprofitVerificationTier(patchedRow, source);
  const city = resolvedCity;
  const state = resolvedState;
  const nteeCode = rowNtee(patchedRow);
  const status = mapNonprofitStatus(patchedRow, source, tier);
  const resolvedEin = rowEin(patchedRow);
  const trustedDescription =
    applyTrustedPresentation
      ? String(
        patchedRow?.description ??
        patchedRow?.summary ??
        profile?.description ??
        profile?.services_offered ??
        profile?.who_you_serve ??
        ""
      ).trim()
      : "";
  const enrichmentShort = String(patchedRow.shortDescription ?? patchedRow.short_description ?? "").trim();
  const headlineSnippet = String(patchedRow.headline ?? "").trim().slice(0, 280);
  const taglineSnippet = String(patchedRow.tagline ?? "").trim().slice(0, 200);
  const trustMode = source === "directory" ? "directory" : "curated";
  const links = mapNonprofitLinks(patchedRow, { trustMode });
  const einNorm = normalizeEinDigits(resolvedEin);
  const einIdentityVerified =
    patchedRow.einIdentityVerified === false
      ? false
      : einNorm.length === 9;
  let computedDescription =
    enrichmentShort ||
    trustedDescription ||
    (applyTrustedPresentation
      ? ""
      : headlineSnippet || taglineSnippet || nteeToService(nteeCode));
  if (applyTrustedPresentation && computedDescription.length > 300) {
    computedDescription = `${computedDescription.slice(0, 297)}…`;
  }
  const locationLine =
    firstNonEmpty(
      baseRow.provenDisplayLocation,
      [resolvedCity, resolvedState].filter(Boolean).join(", "),
      trustedLocation.raw
    ) || (applyTrustedPresentation ? "National" : "Unknown Location");
  const cardShell = {
    id: baseRow.id || resolvedEin || displayName,
    ein: resolvedEin,
    einNormalized: einNorm,
    einIdentityVerified,
    name: displayName,
    city,
    state,
    location: locationLine,
    category,
    tier,
    status,
    description: computedDescription,
    headline: String(patchedRow.headline ?? "").trim(),
    tagline: String(patchedRow.tagline ?? "").trim(),
    shortDescription: enrichmentShort,
    longDescription: String(patchedRow.longDescription ?? patchedRow.long_description ?? "").trim(),
    missionStatement: String(patchedRow.missionStatement ?? patchedRow.mission_statement ?? "").trim(),
    serviceArea: String(patchedRow.serviceArea ?? patchedRow.service_area ?? "").trim(),
    foundedYear: patchedRow.foundedYear ?? patchedRow.founded_year ?? null,
    heroImageUrl: String(patchedRow.heroImageUrl ?? patchedRow.hero_image_url ?? "").trim(),
    thumbnailUrl: String(patchedRow.thumbnailUrl ?? patchedRow.thumbnail_url ?? "").trim(),
    publicSlug: String(patchedRow.publicSlug ?? patchedRow.public_slug ?? "").trim(),
    metadataSource: String(patchedRow.metadataSource ?? patchedRow.metadata_source ?? "").trim(),
    profileEnrichedAt: patchedRow.profileEnrichedAt ?? patchedRow.profile_enriched_at ?? null,
    lastVerifiedAt: patchedRow.lastVerifiedAt ?? patchedRow.last_verified_at ?? null,
    displayNameOnSite: String(
      patchedRow.displayNameOnSite ?? patchedRow.display_name_on_site ?? ""
    ).trim(),
    researchStatus: String(patchedRow.researchStatus ?? patchedRow.research_status ?? "").trim(),
    sourceSummary: String(patchedRow.sourceSummary ?? patchedRow.source_summary ?? "").trim(),
    webSearchSupplemented: !!(patchedRow.webSearchSupplemented ?? patchedRow.web_search_supplemented),
    logoUrl: String(baseRow.logoUrl ?? baseRow.logo_url ?? "").trim(),
    cityImageUrl: String(baseRow.cityImageUrl ?? baseRow.fallback_city_image_url ?? baseRow.city_image_url ?? "").trim(),
    fallbackLocation: [city, state].filter(Boolean).join(", ") || state || city || "Unknown Location",
    links,
    primaryLink: links.find((l) => l.type === "website")?.url || links[0]?.url || "",
    nonprofitType: String(
      patchedRow.nonprofit_type ?? patchedRow.nonprofitType ?? profile?.nonprofit_type ?? ""
    ).trim(),
    raw: baseRow,
  };
  return {
    ...cardShell,
    findInfoHref: resolveFindInfoHref(cardShell),
  };
}

