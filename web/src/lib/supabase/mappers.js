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
  return {
    ein: String(profile.ein ?? org.ein ?? "").trim(),
    orgName: String(profile.display_name_override ?? org.name ?? "Proven Ally").trim(),
    city: String(org.city ?? "").trim(),
    state: String(org.state ?? "").trim(),
    nteeCode: String(org.ntee_code ?? "").trim(),
    isTrusted: true,
    website: profile.website ?? "",
    logoUrl: profile.logo_url ?? org.logo_url ?? "",
    verificationTier: profile.verification_tier ?? org.verification_tier ?? "featured",
    verificationSource: profile.verification_source ?? org.verification_source ?? "trusted_profile",
    instagramUrl: profile.instagram_url ?? "",
    facebookUrl: profile.facebook_url ?? "",
    youtubeUrl: profile.youtube_url ?? "",
    xUrl: profile.x_url ?? "",
    linkedinUrl: profile.linkedin_url ?? "",
    raw: { profile, org },
  };
}
