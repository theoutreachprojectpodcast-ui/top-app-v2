import { einLookupVariants, expandEinLookupList, normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import {
  applyDirectoryFilters,
  shouldRetryDirectoryWithoutStatus,
} from "@/lib/supabase/directoryFilters";

export {
  applyDirectoryFilters,
  isMissingDirectoryStatusColumn,
  shouldRetryDirectoryWithoutStatus,
} from "@/lib/supabase/directoryFilters";

const DIRECTORY_SOURCE = "nonprofits_search_app_v1";
const TRUSTED_PROFILES_SOURCE = "nonprofit_profiles";
const TRUSTED_ORGS_SOURCE = "nonprofits";
const DIRECTORY_ENRICHMENT_SOURCE = "nonprofit_directory_enrichment";

async function runDirectorySelect(supabase, filters, { from, to, head, includePublicStatus }) {
  const selectOpts = head ? { count: "exact", head: true } : { count: "exact" };
  let query = supabase.from(DIRECTORY_SOURCE).select(head ? "ein" : "*", selectOpts);
  query = applyDirectoryFilters(query, filters, { includePublicStatus });
  if (!head && typeof from === "number" && typeof to === "number") {
    query = query.range(from, to);
  }
  return query;
}

export async function queryDirectoryPage(supabase, filters, from, to) {
  let result = await runDirectorySelect(supabase, filters, {
    from,
    to,
    head: false,
    includePublicStatus: true,
  });
  if (shouldRetryDirectoryWithoutStatus(result, { attemptedWithStatus: true })) {
    result = await runDirectorySelect(supabase, filters, {
      from,
      to,
      head: false,
      includePublicStatus: false,
    });
  }
  return result;
}

export async function queryDirectoryCount(supabase, filters) {
  let result = await runDirectorySelect(supabase, filters, {
    head: true,
    includePublicStatus: true,
  });
  if (shouldRetryDirectoryWithoutStatus(result, { attemptedWithStatus: true })) {
    result = await runDirectorySelect(supabase, filters, {
      head: true,
      includePublicStatus: false,
    });
  }
  return result;
}

export async function queryProfilesByEin(supabase, eins) {
  if (!eins?.length) return { data: [], error: null };
  return supabase
    .from(TRUSTED_PROFILES_SOURCE)
    .select("ein,logo_url,is_trusted,is_strategic,website,display_name_override")
    .in("ein", eins);
}

export async function queryTrustedProfiles(supabase, limit = 500) {
  return supabase
    .from(TRUSTED_PROFILES_SOURCE)
    .select("ein,display_name_override,website,logo_url,verification_tier,verification_source,instagram_url,facebook_url,youtube_url,x_url,linkedin_url,is_trusted")
    .eq("is_trusted", true)
    .limit(limit);
}

export async function queryTrustedOrgsByEin(supabase, eins) {
  return supabase
    .from(TRUSTED_ORGS_SOURCE)
    .select("ein,name,city,state,ntee_code,logo_url,verification_tier,verification_source")
    .in("ein", eins);
}

/**
 * Batch fetch legacy `nonprofits` rows by normalized EIN (digits + dashed).
 * Used when the search materialized view is stale or missing a row that still exists upstream.
 */
export async function queryLegacyOrgsByEins(supabase, normalizedEins = []) {
  const uniq = [...new Set(normalizedEins.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];
  if (!uniq.length) return { data: [], byEin: new Map(), error: null };
  const variants = expandEinLookupList(uniq);
  const res = await supabase
    .from(TRUSTED_ORGS_SOURCE)
    .select("ein,name,org_name,city,state,ntee_code,logo_url,website,directory_status")
    .in("ein", variants);
  if (res.error) {
    // Older schemas may lack optional columns — retry with a minimal select.
    const msg = String(res.error.message || "").toLowerCase();
    if (/org_name|directory_status|logo_url|website|schema cache|could not find/i.test(msg)) {
      const retry = await supabase
        .from(TRUSTED_ORGS_SOURCE)
        .select("ein,name,city,state,ntee_code")
        .in("ein", variants);
      if (retry.error) return { data: [], byEin: new Map(), error: retry.error };
      const byEin = new Map();
      for (const row of retry.data || []) {
        const k = normalizeEinDigits(row?.ein);
        if (k.length === 9 && !byEin.has(k)) {
          byEin.set(k, {
            ...row,
            org_name: row.name || "",
            ein_identity_verified: true,
          });
        }
      }
      return { data: uniq.map((k) => byEin.get(k)).filter(Boolean), byEin, error: null };
    }
    return { data: [], byEin: new Map(), error: res.error };
  }
  const byEin = new Map();
  for (const row of res.data || []) {
    const k = normalizeEinDigits(row?.ein);
    if (k.length === 9 && !byEin.has(k)) {
      byEin.set(k, {
        ...row,
        org_name: row.org_name || row.name || "",
        ein_identity_verified: true,
      });
    }
  }
  return { data: uniq.map((k) => byEin.get(k)).filter(Boolean), byEin, error: null };
}

/** Normalized 9-digit EINs (also matches dashed EIN column values). */
export async function queryDirectoryEnrichmentByEins(supabase, normalizedEins = []) {
  const uniq = [...new Set(normalizedEins.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];
  if (!uniq.length) return { data: [], error: null };
  const variants = expandEinLookupList(uniq);
  return supabase.from(DIRECTORY_ENRICHMENT_SOURCE).select("*").in("ein", variants);
}

export async function queryDirectoryEnrichmentByEin(supabase, normalizedEin) {
  const digits = normalizeEinDigits(normalizedEin);
  if (digits.length !== 9) return { data: null, error: null };
  for (const variant of einLookupVariants(digits)) {
    const res = await supabase.from(DIRECTORY_ENRICHMENT_SOURCE).select("*").eq("ein", variant).maybeSingle();
    if (res.error) return res;
    if (res.data) return res;
  }
  return { data: null, error: null };
}

/**
 * Resolve a directory row by EIN from URL param (9 digits or dashed).
 */
export async function queryDirectoryOrgByEin(supabase, einRaw) {
  const digits = normalizeEinDigits(einRaw);
  if (digits.length !== 9) return { data: null, error: null };
  for (const variant of einLookupVariants(digits)) {
    const res = await supabase.from(DIRECTORY_SOURCE).select("*").eq("ein", variant).maybeSingle();
    if (res.error) return res;
    if (res.data) return res;
  }
  return { data: null, error: null };
}

/** Batch fetch directory rows by normalized 9-digit EIN (handles dashed, plain, or unpadded ein values). */
export async function queryDirectoryOrgsByEins(supabase, normalizedEins = []) {
  const uniq = [...new Set(normalizedEins.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];
  if (!uniq.length) return { data: [], byEin: new Map(), error: null };
  const variants = expandEinLookupList(uniq);
  const res = await supabase.from(DIRECTORY_SOURCE).select("*").in("ein", variants);
  if (res.error) return { data: [], byEin: new Map(), error: res.error };
  const byEin = new Map();
  for (const row of res.data || []) {
    const k = normalizeEinDigits(row?.ein);
    if (k.length === 9 && !byEin.has(k)) byEin.set(k, row);
  }
  return { data: uniq.map((k) => byEin.get(k)).filter(Boolean), byEin, error: null };
}
