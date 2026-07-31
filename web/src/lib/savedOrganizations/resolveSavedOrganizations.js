import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { mergeDirectoryRowWithEnrichment, enrichmentRowsByEin } from "@/lib/supabase/enrichmentMerge";
import { mapDirectoryRow } from "@/lib/supabase/mappers";
import {
  queryDirectoryEnrichmentByEins,
  queryDirectoryOrgsByEins,
} from "@/lib/supabase/queries";
import { isPlaceholderOrgName } from "@/lib/formatOrgName";

const TRUSTED_PROFILES_SOURCE = "nonprofit_profiles";

/** @typedef {'resolved' | 'unavailable'} SavedOrgResolutionStatus */

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const t = String(v ?? "").trim();
    if (t && !isPlaceholderOrgName(t)) return t;
  }
  return "";
}

function einVariants(normalizedEins = []) {
  return [...new Set(normalizedEins.flatMap((e) => [e, `${e.slice(0, 2)}-${e.slice(2)}`]))];
}

/** Fill sparse directory rows from nonprofit_profiles (name, website, logo, socials). */
export function overlayNonprofitProfileOnDirectoryRow(row = {}, prof) {
  if (!prof || typeof prof !== "object") return row;
  const nameOverride = firstNonEmpty(prof.display_name_override, prof.organization_name, prof.legal_name);
  return {
    ...row,
    display_name_override: nameOverride || row.display_name_override,
    org_name: firstNonEmpty(nameOverride, row.org_name, row.organization_name, row.name),
    display_name: firstNonEmpty(nameOverride, row.display_name, row.org_name),
    canonical_display_name: firstNonEmpty(row.canonical_display_name, nameOverride),
    website: firstNonEmpty(prof.website, row.website, row.Website),
    logo_url: firstNonEmpty(prof.logo_url, row.logo_url, row.logoUrl),
    facebook_url: firstNonEmpty(prof.facebook_url, row.facebook_url, row.facebook),
    instagram_url: firstNonEmpty(prof.instagram_url, row.instagram_url, row.instagram),
    youtube_url: firstNonEmpty(prof.youtube_url, row.youtube_url, row.youtube),
    x_url: firstNonEmpty(prof.x_url, row.x_url, row.twitter),
    linkedin_url: firstNonEmpty(prof.linkedin_url, row.linkedin_url, row.linkedin),
    short_description: firstNonEmpty(prof.description, row.short_description, row.description),
  };
}

/**
 * Build a synthetic directory-shaped row from enrichment / profile when the search view has no match.
 * Used so saved favorites still resolve a public name after directory gaps or identity flags.
 */
export function buildSavedOrgFallbackRow(ein, enrich = null, prof = null) {
  const e = enrich && typeof enrich === "object" ? enrich : null;
  const p = prof && typeof prof === "object" ? prof : null;
  const name = firstNonEmpty(
    e?.canonical_display_name,
    e?.display_name_on_site,
    e?.website_verified_name,
    p?.display_name_override,
    p?.organization_name,
    p?.legal_name,
    e?.irs_name,
    e?.legal_name,
  );
  const row = {
    ein,
    org_name: name,
    display_name: name,
    canonical_display_name: firstNonEmpty(e?.canonical_display_name, name),
    city: firstNonEmpty(e?.city),
    state: firstNonEmpty(e?.state),
    ntee_code: firstNonEmpty(e?.ntee_code),
    website: firstNonEmpty(e?.website_url, p?.website),
    logo_url: firstNonEmpty(e?.logo_url, p?.logo_url),
    short_description: firstNonEmpty(e?.short_description, p?.description),
    public_slug: firstNonEmpty(e?.public_slug),
    // Saved-profile display must not hide names solely due to enrichment identity flags.
    ein_identity_verified: true,
    _savedOrgFallback: true,
  };
  return overlayNonprofitProfileOnDirectoryRow(row, p);
}

function mappedName(mapped) {
  return firstNonEmpty(
    mapped?.canonicalDisplayName,
    mapped?.orgName,
    mapped?.displayNameOnSite,
    mapped?.irsName,
    mapped?.legalName,
  );
}

/**
 * Ordered list of mapDirectoryRow outputs for saved EINs (directory + enrichment + profile overlay).
 * Always returns one row per requested EIN (after normalization). Unresolvable EINs get an empty
 * orgName and `savedResolutionStatus: "unavailable"` so the UI can show a clear unavailable state
 * instead of the misleading "Saved organization" placeholder.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} einOrdered — normalized order from saved-org list
 * @returns {Promise<Array<ReturnType<typeof mapDirectoryRow> & { savedResolutionStatus: SavedOrgResolutionStatus, nonprofitId: string }>>}
 */
export async function resolveSavedOrganizationDirectoryRows(supabase, einOrdered = []) {
  const normalized = einOrdered.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9);
  if (!normalized.length || !supabase) return [];

  const uniq = [...new Set(normalized)];
  const { byEin: dirByEin, error: dirErr } = await queryDirectoryOrgsByEins(supabase, uniq);
  if (dirErr) {
    // Soft-fail: still try enrichment/profiles so existing saves are not blanked by a transient error.
    console.warn?.("[saved-orgs] directory lookup failed:", dirErr.message || dirErr);
  }

  let enrichMap = new Map();
  const { data: enrichData, error: enrichErr } = await queryDirectoryEnrichmentByEins(supabase, uniq);
  if (!enrichErr && enrichData?.length) enrichMap = enrichmentRowsByEin(enrichData);

  const profVariants = einVariants(uniq);
  const { data: profData, error: profErr } = await supabase
    .from(TRUSTED_PROFILES_SOURCE)
    .select(
      "ein,website,logo_url,facebook_url,instagram_url,youtube_url,x_url,linkedin_url,display_name_override,description",
    )
    .in("ein", profVariants);
  const profByEin = new Map();
  if (!profErr && Array.isArray(profData)) {
    for (const p of profData) {
      const k = normalizeEinDigits(p?.ein);
      if (k.length === 9 && !profByEin.has(k)) profByEin.set(k, p);
    }
  }

  /** @type {Map<string, ReturnType<typeof mapDirectoryRow> & { savedResolutionStatus: SavedOrgResolutionStatus, nonprofitId: string }>} */
  const byEin = new Map();

  for (const ein of uniq) {
    const enrich = enrichMap.get(ein) || null;
    const prof = profByEin.get(ein) || null;
    let raw = dirByEin?.get(ein) || null;

    if (raw) {
      let merged = mergeDirectoryRowWithEnrichment(raw, enrich);
      if (prof) merged = overlayNonprofitProfileOnDirectoryRow(merged, prof);
      // For the user's own saved list, prefer showing a real name even when identity enrichment is pending.
      if (merged.ein_identity_verified === false) {
        const fallbackName = firstNonEmpty(
          merged.canonical_display_name,
          merged.display_name,
          merged.org_name,
          merged.organization_name,
          merged.name,
          enrich?.canonical_display_name,
          enrich?.irs_name,
          prof?.display_name_override,
        );
        if (fallbackName) {
          merged = {
            ...merged,
            ein_identity_verified: true,
            org_name: firstNonEmpty(merged.org_name, fallbackName),
            display_name: firstNonEmpty(merged.display_name, fallbackName),
            canonical_display_name: firstNonEmpty(merged.canonical_display_name, fallbackName),
          };
        }
      }
      raw = merged;
    } else if (enrich || prof) {
      raw = buildSavedOrgFallbackRow(ein, enrich, prof);
      if (enrich) raw = mergeDirectoryRowWithEnrichment(raw, enrich);
    }

    if (!raw) {
      const mapped = mapDirectoryRow({ ein, org_name: "", ein_identity_verified: true });
      byEin.set(ein, {
        ...mapped,
        orgName: "",
        canonicalDisplayName: "",
        savedResolutionStatus: "unavailable",
        nonprofitId: ein,
      });
      continue;
    }

    const mapped = mapDirectoryRow(raw);
    const name = mappedName(mapped);
    byEin.set(ein, {
      ...mapped,
      orgName: name,
      savedResolutionStatus: name ? "resolved" : "unavailable",
      nonprofitId: ein,
    });
  }

  // Preserve caller order (including duplicates collapsed to first occurrence via uniq map).
  return normalized.map((ein) => byEin.get(ein)).filter(Boolean);
}

/**
 * Confirm a nonprofit exists for save/favorite (directory, enrichment, curated profile, or trusted catalog).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} einRaw
 */
export async function nonprofitExistsForSave(supabase, einRaw) {
  const ein = normalizeEinDigits(einRaw);
  if (ein.length !== 9 || !supabase) return false;
  const { byEin } = await queryDirectoryOrgsByEins(supabase, [ein]);
  if (byEin?.has(ein)) return true;
  const { data: enrich } = await queryDirectoryEnrichmentByEins(supabase, [ein]);
  if (Array.isArray(enrich) && enrich.length) return true;
  const variants = einVariants([ein]);
  const { data: prof } = await supabase.from(TRUSTED_PROFILES_SOURCE).select("ein").in("ein", variants).limit(1);
  if (Array.isArray(prof) && prof.length > 0) return true;

  // Trusted Resources catalog (service-role) — same EIN may appear only here for curated orgs.
  const trustedTable =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_TRUSTED_RESOURCES_TABLE) || "trusted_resources";
  const { data: trusted, error: trustedErr } = await supabase
    .from(trustedTable)
    .select("ein")
    .in("ein", variants)
    .limit(1);
  if (!trustedErr && Array.isArray(trusted) && trusted.length > 0) return true;

  return false;
}
