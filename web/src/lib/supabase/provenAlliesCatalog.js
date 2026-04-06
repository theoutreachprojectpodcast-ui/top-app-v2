import { formatOrganizationDisplayName } from "@/lib/formatOrgName";

export const PROVEN_ALLIES_TABLE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PROVEN_ALLIES_TABLE) || "proven_allies";

/** Match trusted-resources/api.js EIN keying for joins. */
export function normalizeEin(value) {
  let d = String(value ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 9) d = d.slice(-9);
  return d.padStart(9, "0");
}

/** Require nine digit characters (after stripping); no short-EIN padding into the table. */
export function parseEinStrict(value) {
  let d = String(value ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 9) d = d.slice(-9);
  return d.length === 9 ? d : "";
}

export function isMissingProvenAlliesTable(error) {
  const c = String(error?.code || "");
  const m = String(error?.message || "").toLowerCase();
  return c === "PGRST205" || m.includes("could not find the table") || m.includes("does not exist");
}

/**
 * Maps a `proven_allies` DB row into the trusted feed shape. Always flows through
 * `mergeProvenAllyPresentation` so `provenAllyRegistry` can enrich by EIN / website / name.
 * Do not set `canonicalDisplayName` here — the registry owns canonical titles when matched.
 */
export function mapProvenAlliesDbRowToTrustedRow(db = {}) {
  const ein = normalizeEin(db.ein);
  const displayNameRaw = String(db.display_name || "").trim();
  const orgNameFromDb = displayNameRaw ? formatOrganizationDisplayName(displayNameRaw) : "";
  const loc =
    String(db.location_label || "").trim() ||
    [String(db.city || "").trim(), String(db.state || "").trim()].filter(Boolean).join(", ");
  const status = String(db.listing_status || "").toLowerCase();
  const provenStatus = status === "active" ? "approved" : "pending";

  return {
    ein,
    orgName: orgNameFromDb,
    website: String(db.website_url || "").trim(),
    logoUrl: String(db.logo_url || "").trim(),
    city: String(db.city || "").trim(),
    state: String(db.state || "").trim(),
    ntee_code: String(db.ntee_code || "").trim(),
    nteeCode: String(db.ntee_code || "").trim(),
    nonprofit_type: String(db.nonprofit_type || "").trim(),
    description: String(db.short_description || "").trim(),
    provenDisplayLocation: loc || "National",
    provenCategoryKey: String(db.category_key || "").trim() || undefined,
    instagramUrl: db.instagram_url || "",
    facebookUrl: db.facebook_url || "",
    youtubeUrl: db.youtube_url || "",
    xUrl: db.x_url || "",
    linkedinUrl: db.linkedin_url || "",
    serves_veterans: db.serves_veterans !== false,
    serves_first_responders: !!db.serves_first_responders,
    isTrusted: true,
    is_trusted: true,
    is_proven_ally: status === "active",
    proven_ally_status: provenStatus,
    listing_status: status,
    raw: {
      profile: {
        ein,
        display_name_override: orgNameFromDb,
        organization_name: orgNameFromDb,
        website: db.website_url,
        logo_url: db.logo_url,
        nonprofit_type: db.nonprofit_type,
        description: db.short_description,
        city: db.city,
        state: db.state,
        ntee_code: db.ntee_code,
        is_trusted: true,
        is_proven_ally: status === "active",
        proven_ally_status: provenStatus,
        instagram_url: db.instagram_url,
        facebook_url: db.facebook_url,
        youtube_url: db.youtube_url,
        x_url: db.x_url,
        linkedin_url: db.linkedin_url,
      },
      org: {},
    },
  };
}

function trimDescription(text, max = 2000) {
  const s = String(text || "").trim();
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

export function buildPendingProvenAllyRowFromApplication(payload = {}, applicationId = null) {
  const fromDirectory = String(payload.organization_id || "").trim();
  const fromManual = String(payload.organization_ein || "").trim();
  const ein = parseEinStrict(fromDirectory || fromManual);
  if (!ein) return null;

  const displayName = String(payload.organization_name || "").trim();
  if (!displayName) return null;

  const who = String(payload.who_you_serve || "").trim();
  const svc = String(payload.services_offered || "").trim();
  const short_description = trimDescription([who, svc].filter(Boolean).join(" — ") || who || svc);

  const vet =
    /veteran/i.test(who) ||
    /veteran/i.test(svc) ||
    /veteran/i.test(String(payload.veteran_support_experience || ""));
  const fr =
    /first\s*responder/i.test(who) ||
    /first\s*responder/i.test(svc) ||
    /first\s*responder/i.test(String(payload.first_responder_support_experience || ""));

  return {
    ein,
    display_name: formatOrganizationDisplayName(displayName),
    website_url: String(payload.website || "").trim() || null,
    logo_url: null,
    city: String(payload.city || "").trim() || null,
    state: String(payload.state || "").trim() || null,
    location_label: null,
    nonprofit_type: String(payload.nonprofit_type || "").trim() || null,
    ntee_code: null,
    category_key: null,
    short_description: short_description || null,
    instagram_url: null,
    facebook_url: null,
    youtube_url: null,
    x_url: null,
    linkedin_url: null,
    serves_veterans: vet || !fr,
    serves_first_responders: fr,
    listing_status: "pending",
    sort_order: 0,
    application_submission_ref: applicationId ? String(applicationId) : null,
  };
}
