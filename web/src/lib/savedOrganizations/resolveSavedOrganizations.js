import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { mergeDirectoryRowWithEnrichment, enrichmentRowsByEin } from "@/lib/supabase/enrichmentMerge";
import { mapDirectoryRow } from "@/lib/supabase/mappers";
import {
  queryDirectoryEnrichmentByEins,
  queryDirectoryOrgsByEins,
} from "@/lib/supabase/queries";

const TRUSTED_PROFILES_SOURCE = "nonprofit_profiles";

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const t = String(v ?? "").trim();
    if (t) return t;
  }
  return "";
}

/** Fill sparse directory rows from nonprofit_profiles (website, logo, socials). */
export function overlayNonprofitProfileOnDirectoryRow(row = {}, prof) {
  if (!prof || typeof prof !== "object") return row;
  return {
    ...row,
    website: firstNonEmpty(prof.website, row.website, row.Website),
    logo_url: firstNonEmpty(prof.logo_url, row.logo_url, row.logoUrl),
    facebook_url: firstNonEmpty(prof.facebook_url, row.facebook_url, row.facebook),
    instagram_url: firstNonEmpty(prof.instagram_url, row.instagram_url, row.instagram),
    youtube_url: firstNonEmpty(prof.youtube_url, row.youtube_url, row.youtube),
    x_url: firstNonEmpty(prof.x_url, row.x_url, row.twitter),
    linkedin_url: firstNonEmpty(prof.linkedin_url, row.linkedin_url, row.linkedin),
  };
}

/**
 * Ordered list of mapDirectoryRow outputs for saved EINs (directory + enrichment + optional profile overlay).
 * Skips EINs with no directory row or failed identity verification.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} einOrdered — normalized order from saved-org list
 */
export async function resolveSavedOrganizationDirectoryRows(supabase, einOrdered = []) {
  const normalized = einOrdered.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9);
  if (!normalized.length || !supabase) return [];

  const uniq = [...new Set(normalized)];
  const { byEin: dirByEin, error: dirErr } = await queryDirectoryOrgsByEins(supabase, uniq);
  if (dirErr) return [];

  let enrichMap = new Map();
  const { data: enrichData, error: enrichErr } = await queryDirectoryEnrichmentByEins(supabase, uniq);
  if (!enrichErr && enrichData?.length) enrichMap = enrichmentRowsByEin(enrichData);

  const profVariants = [...new Set(uniq.flatMap((e) => [e, `${e.slice(0, 2)}-${e.slice(2)}`]))];
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

  const out = [];
  for (const ein of uniq) {
    const raw = dirByEin.get(ein);
    if (!raw) continue;
    let merged = mergeDirectoryRowWithEnrichment(raw, enrichMap.get(ein));
    const prof = profByEin.get(ein);
    if (prof) merged = overlayNonprofitProfileOnDirectoryRow(merged, prof);
    if (merged.ein_identity_verified === false) continue;
    out.push(mapDirectoryRow(merged));
  }
  return out;
}
