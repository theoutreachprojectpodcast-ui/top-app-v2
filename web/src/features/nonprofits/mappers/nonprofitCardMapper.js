import { mapNonprofitCategory } from "@/features/nonprofits/mappers/categoryMapper";
import { getNonprofitVerificationTier } from "@/lib/nonprofits/verification";
import { mapNonprofitStatus } from "@/features/nonprofits/mappers/nonprofitStatusMapper";
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

function formatDisplayName(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return normalized
    .split(" ")
    .map((token) => {
      if (!token) return token;
      if (/^[A-Z0-9&]+$/.test(token) && token.length <= 4) return token;
      return `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

export function mapNonprofitCardRow(row = {}, source = "directory") {
  const profile = row?.raw?.profile || {};
  const trustedLocation = resolveTrustedLocation(row, profile);
  const resolvedCity = firstNonEmpty(rowCity(row), row.city, row.address_city, profile.city, profile.address_city, trustedLocation.city);
  const resolvedState = firstNonEmpty(rowState(row), row.state, row.address_state, profile.state, profile.address_state, trustedLocation.state);
  const resolvedName = firstNonEmpty(
    rowName(row),
    row.orgName,
    row.organization_name,
    row.display_name_override,
    profile.organization_name,
    profile.legal_name,
    profile.title,
    profile.org_name,
    profile.name,
    "Unknown Organization"
  );

  const patchedRow = {
    ...row,
    orgName: resolvedName,
    city: resolvedCity,
    state: resolvedState,
    nonprofit_type: firstNonEmpty(row.nonprofit_type, row.nonprofitType, profile.nonprofit_type, profile.category, profile.organization_type),
    serves_veterans: row.serves_veterans ?? row.servesVeterans ?? String(firstNonEmpty(profile.who_you_serve, profile.veteran_support_experience)).toLowerCase().includes("veteran"),
    serves_first_responders:
      row.serves_first_responders ??
      row.servesFirstResponders ??
      String(firstNonEmpty(profile.who_you_serve, profile.first_responder_support_experience)).toLowerCase().includes("first responder"),
    ntee_code: firstNonEmpty(
      row.ntee_code,
      row.nteeCode,
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
  const displayName = formatDisplayName(resolvedName || "Unknown Organization");
  const trustedDescription =
    source === "trusted"
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
  const computedDescription = trustedDescription || (source === "trusted" ? "" : nteeToService(nteeCode));
  return {
    id: row.id || resolvedEin || displayName,
    ein: resolvedEin,
    name: displayName,
    city,
    state,
    location: [city, state].filter(Boolean).join(", ") || trustedLocation.raw || "Unknown Location",
    category,
    tier,
    status,
    description: computedDescription,
    logoUrl: String(row.logoUrl ?? row.logo_url ?? "").trim(),
    cityImageUrl: String(row.cityImageUrl ?? row.fallback_city_image_url ?? row.city_image_url ?? "").trim(),
    fallbackLocation: [city, state].filter(Boolean).join(", ") || state || city || "Unknown Location",
    links,
    primaryLink: links.find((l) => l.type === "website")?.url || links[0]?.url || "",
    raw: row,
  };
}

