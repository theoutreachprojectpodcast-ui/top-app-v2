import { resolveTrustedResourceDisplayName, sanitizeOrganizationNameForDisplay } from "@/lib/entityDisplayName";

/** Supabase Trusted Resources catalog table name (override for forks). */
export const TRUSTED_RESOURCES_TABLE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_TRUSTED_RESOURCES_TABLE) || "trusted_resources";

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

export function isMissingTrustedResourcesTable(error) {
  const c = String(error?.code || "");
  const m = String(error?.message || "").toLowerCase();
  return c === "PGRST205" || m.includes("could not find the table") || m.includes("does not exist");
}

/** Anon / JWT cannot read `trusted_resources` under RLS — fall back to curated registry instead of failing the whole hub. */
export function isTrustedCatalogReadDenied(error) {
  if (!error) return false;
  const c = String(error.code || "");
  const m = String(error.message || "").toLowerCase();
  if (c === "42501") return true;
  if (c === "PGRST301") return true;
  if (m.includes("permission denied")) return true;
  if (m.includes("row-level security") || m.includes("rls policy")) return true;
  if (m.includes("jwt")) return true;
  return false;
}

/**
 * Maps a Trusted Resources catalog (`trusted_resources`) DB row into the feed shape.
 * Rows are joined to the public directory + enrichment in `trustedDirectoryJoin.js`, then
 * `mergeTrustedResourcesPresentation` + `trustedResourcesRegistry` enrich by EIN / website / name.
 * Do not set `canonicalDisplayName` here — the registry owns canonical titles when matched.
 */
export function mapTrustedResourcesDbRowToTrustedRow(db = {}) {
  const ein = normalizeEin(db.ein);
  const displayNameRaw = String(db.display_name || "").trim();
  const orgNameFromDb = resolveTrustedResourceDisplayName({
    candidateNames: displayNameRaw ? [displayNameRaw] : [],
    trustedResourceSlug: String(db.slug || "").trim(),
    websiteUrl: String(db.website_url || "").trim(),
    emptyFallback: "",
  });
  const loc =
    String(db.location_label || "").trim() ||
    [String(db.city || "").trim(), String(db.state || "").trim()].filter(Boolean).join(", ");
  const status = String(db.listing_status || "").toLowerCase();
  const listingApprovalStatus = status === "active" ? "approved" : "pending";

  return {
    ein,
    orgName: orgNameFromDb,
    display_name: displayNameRaw,
    catalog_display_name: displayNameRaw,
    website: String(db.website_url || "").trim(),
    logoUrl: String(db.logo_url || "").trim(),
    header_image_url: String(db.header_image_url || "").trim(),
    header_image_source_url: String(db.header_image_source_url || "").trim(),
    header_image_source_type: String(db.header_image_source_type || "").trim(),
    header_image_status: String(db.header_image_status || "").trim(),
    header_image_review_status: String(db.header_image_review_status || "").trim(),
    header_image_notes: String(db.header_image_notes || "").trim(),
    header_image_last_enriched_at: db.header_image_last_enriched_at ?? null,
    city: String(db.city || "").trim(),
    state: String(db.state || "").trim(),
    ntee_code: String(db.ntee_code || "").trim(),
    nteeCode: String(db.ntee_code || "").trim(),
    nonprofit_type: String(db.nonprofit_type || "").trim(),
    description: String(db.short_description || "").trim(),
    trustedResourceDisplayLocation: loc || "National",
    trustedResourceCategoryKey: String(db.category_key || "").trim() || undefined,
    instagramUrl: db.instagram_url || "",
    facebookUrl: db.facebook_url || "",
    youtubeUrl: db.youtube_url || "",
    xUrl: db.x_url || "",
    linkedinUrl: db.linkedin_url || "",
    serves_veterans: db.serves_veterans !== false,
    serves_first_responders: !!db.serves_first_responders,
    isTrusted: true,
    is_trusted: true,
    is_trusted_resource: status === "active",
    trusted_resource_status: listingApprovalStatus,
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
        is_trusted_resource: status === "active",
        trusted_resource_status: listingApprovalStatus,
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

export function buildPendingTrustedResourceRowFromApplication(payload = {}, applicationId = null) {
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
    display_name: sanitizeOrganizationNameForDisplay(displayName, { trustCanonical: false }),
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
