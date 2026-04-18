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

function nameFromWebsite(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    const host = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname
      .replace(/^www\./i, "")
      .split(".")[0];
    const safe = host.replace(/[-_]+/g, " ").trim();
    if (!safe) return "";
    return safe.replace(/\b\w/g, (ch) => ch.toUpperCase());
  } catch {
    return "";
  }
}

function toDisplayOrganizationName(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withSpaces = raw
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return withSpaces
    .split(" ")
    .map((token) => {
      if (!token) return token;
      if (/^[A-Z0-9&]+$/.test(token) && token.length <= 4) return token;
      return `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

export function mapDirectoryRow(row = {}) {
  return {
    ein: String(row.ein ?? row.EIN ?? "").trim(),
    orgName: String(row.org_name ?? row.name ?? row.NAME ?? "Unknown Organization").trim(),
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
    raw: row,
  };
}

export function mapTrustedRow(profile = {}, org = {}) {
  const website = firstNonEmpty(profile.website, org.website);
  const websiteName = nameFromWebsite(website);
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
    orgName: toDisplayOrganizationName(firstNonEmpty(
      profile.display_name_override,
      profile.organization_name,
      profile.legal_name,
      profile.title,
      profile.org_name,
      org.name,
      org.organization_name,
      org.org_name,
      profile.name,
      websiteName,
      "Unknown Organization"
    )),
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
