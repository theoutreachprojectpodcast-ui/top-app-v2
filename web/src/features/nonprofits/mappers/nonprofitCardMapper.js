import { mapNonprofitCategory } from "@/features/nonprofits/mappers/categoryMapper";
import { getNonprofitVerificationTier } from "@/lib/nonprofits/verification";
import { mapNonprofitStatus } from "@/features/nonprofits/mappers/nonprofitStatusMapper";
import { mergeProvenAllyPresentation } from "@/features/trusted-resources/provenAllyPresentation";
import {
  formatOrganizationDisplayName,
  humanizeProvenAllySlug,
  isPlaceholderOrgName,
  normalizeOrganizationWhitespace,
} from "@/lib/formatOrgName";
import { rowCity, rowEin, rowName, rowNtee, rowState } from "@/lib/utils";
import { nteeToService } from "@/lib/utils";
import { mapNonprofitLinks } from "@/features/nonprofits/mappers/nonprofitLinksMapper";

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

function firstNonEmptyDisplayNoPlaceholder(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text || text === "—" || isPlaceholderOrgName(text)) continue;
    return text;
  }
  return "";
}

/** Curated + universal proven-ally formatting whenever the row is a proven ally, not only on the trusted tab */
function needsProvenAllyPresentation(row = {}, source) {
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
  const applyProvenPresentation = needsProvenAllyPresentation(row, source);
  const baseRow = applyProvenPresentation ? mergeProvenAllyPresentation(row) : row;
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
  const resolvedName = baseRow.canonicalDisplayName
    ? normalizeOrganizationWhitespace(baseRow.canonicalDisplayName)
    : firstNonEmptyDisplayNoPlaceholder(
        baseRow.orgName,
        rowName(baseRow),
        baseRow.display_name_override,
        orgRaw.organization_name,
        orgRaw.org_name,
        orgRaw.name,
        orgRaw.NAME,
        profile.display_name_override,
        profile.organization_name,
        profile.legal_name,
        profile.title,
        profile.org_name,
        profile.name
      );

  const patchedRow = {
    ...baseRow,
    orgName: resolvedName,
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
    applyProvenPresentation
      ? String(
        patchedRow?.description ??
        patchedRow?.summary ??
        profile?.description ??
        profile?.services_offered ??
        profile?.who_you_serve ??
        ""
      ).trim()
      : "";
  const links = mapNonprofitLinks(patchedRow);
  let computedDescription = trustedDescription || (applyProvenPresentation ? "" : nteeToService(nteeCode));
  if (applyProvenPresentation && computedDescription.length > 300) {
    computedDescription = `${computedDescription.slice(0, 297)}…`;
  }
  let displayName;
  if (baseRow.canonicalDisplayName) {
    displayName = normalizeOrganizationWhitespace(baseRow.canonicalDisplayName);
  } else if (resolvedName && !isPlaceholderOrgName(resolvedName)) {
    displayName = formatOrganizationDisplayName(resolvedName);
  } else if (baseRow.provenAllySlug) {
    displayName = humanizeProvenAllySlug(baseRow.provenAllySlug);
  } else if (String(resolvedEin || "").trim()) {
    displayName = `Proven ally (EIN ${resolvedEin})`;
  } else {
    displayName = "Proven ally";
  }
  const locationLine =
    firstNonEmpty(
      baseRow.provenDisplayLocation,
      [resolvedCity, resolvedState].filter(Boolean).join(", "),
      trustedLocation.raw
    ) || (applyProvenPresentation ? "National" : "Unknown Location");
  return {
    id: baseRow.id || resolvedEin || displayName,
    ein: resolvedEin,
    name: displayName,
    city,
    state,
    location: locationLine,
    category,
    tier,
    status,
    description: computedDescription,
    logoUrl: String(baseRow.logoUrl ?? baseRow.logo_url ?? "").trim(),
    cityImageUrl: String(baseRow.cityImageUrl ?? baseRow.fallback_city_image_url ?? baseRow.city_image_url ?? "").trim(),
    fallbackLocation: [city, state].filter(Boolean).join(", ") || state || city || "Unknown Location",
    links,
    primaryLink: links.find((l) => l.type === "website")?.url || links[0]?.url || "",
    raw: baseRow,
  };
}

