import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

const DIRECTORY_SOURCE = "nonprofits_search_app_v1";
const TRUSTED_PROFILES_SOURCE = "nonprofit_profiles";
const TRUSTED_ORGS_SOURCE = "nonprofits";
const DIRECTORY_ENRICHMENT_SOURCE = "nonprofit_directory_enrichment";

export function applyDirectoryFilters(query, filters, { includePublicStatus = true } = {}) {
  let q = query.eq("state", filters.state);

  // Public directory: approved rows, or legacy rows with NULL status.
  // Pending / hidden / rejected IRS imports stay out of member search.
  if (includePublicStatus) {
    q = q.or("directory_status.eq.approved,directory_status.is.null");
  }

  if ((filters.q || "").trim()) {
    const term = String(filters.q).replace(/,/g, " ").trim();
    q = q.or(`org_name.ilike.%${term}%,city.ilike.%${term}%`);
  }

  if (filters.service) q = q.ilike("ntee_code", `${filters.service}%`);
  if (filters.audience === "veteran") q = q.eq("serves_veterans", true);
  if (filters.audience === "first_responder") q = q.eq("serves_first_responders", true);
  if (filters.irsSubsection) q = q.eq("irs_subsection", String(filters.irsSubsection));

  return q;
}

function isMissingDirectoryStatusColumn(error) {
  const msg = String(error?.message || "");
  return /directory_status/i.test(msg) && (/does not exist|schema cache|Could not find/i.test(msg));
}

export async function queryDirectoryPage(supabase, filters, from, to) {
  let query = supabase.from(DIRECTORY_SOURCE).select("*").range(from, to);
  query = applyDirectoryFilters(query, filters, { includePublicStatus: true });
  let result = await query;
  if (result.error && isMissingDirectoryStatusColumn(result.error)) {
    query = supabase.from(DIRECTORY_SOURCE).select("*").range(from, to);
    query = applyDirectoryFilters(query, filters, { includePublicStatus: false });
    result = await query;
  }
  return result;
}

export async function queryDirectoryCount(supabase, filters) {
  let query = supabase.from(DIRECTORY_SOURCE).select("*", { count: "exact", head: true });
  query = applyDirectoryFilters(query, filters, { includePublicStatus: true });
  let result = await query;
  if (result.error && isMissingDirectoryStatusColumn(result.error)) {
    query = supabase.from(DIRECTORY_SOURCE).select("*", { count: "exact", head: true });
    query = applyDirectoryFilters(query, filters, { includePublicStatus: false });
    result = await query;
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
  const variants = [...new Set(uniq.flatMap((e) => [e, `${e.slice(0, 2)}-${e.slice(2)}`]))];
  const res = await supabase
    .from(TRUSTED_ORGS_SOURCE)
    .select("ein,name,org_name,city,state,ntee_code,logo_url,website,directory_status")
    .in("ein", variants);
  if (res.error) {
    // Older schemas may lack org_name / directory_status — retry minimal columns.
    const msg = String(res.error.message || "").toLowerCase();
    if (/org_name|directory_status|schema cache|could not find/i.test(msg)) {
      const retry = await supabase
        .from(TRUSTED_ORGS_SOURCE)
        .select("ein,name,city,state,ntee_code,logo_url,website")
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
  const variants = [...new Set(uniq.flatMap((e) => [e, `${e.slice(0, 2)}-${e.slice(2)}`]))];
  return supabase.from(DIRECTORY_ENRICHMENT_SOURCE).select("*").in("ein", variants);
}

export async function queryDirectoryEnrichmentByEin(supabase, normalizedEin) {
  if (!normalizedEin) return { data: null, error: null };
  return supabase.from(DIRECTORY_ENRICHMENT_SOURCE).select("*").eq("ein", normalizedEin).maybeSingle();
}

/**
 * Resolve a directory row by EIN from URL param (9 digits or dashed).
 */
export async function queryDirectoryOrgByEin(supabase, einRaw) {
  const digits = String(einRaw ?? "").replace(/\D/g, "");
  if (digits.length !== 9) return { data: null, error: null };
  const dashed = `${digits.slice(0, 2)}-${digits.slice(2)}`;
  const res = await supabase.from(DIRECTORY_SOURCE).select("*").eq("ein", digits).maybeSingle();
  if (res.data) return res;
  return supabase.from(DIRECTORY_SOURCE).select("*").eq("ein", dashed).maybeSingle();
}

/** Batch fetch directory rows by normalized 9-digit EIN (handles dashed or plain ein column values). */
export async function queryDirectoryOrgsByEins(supabase, normalizedEins = []) {
  const uniq = [...new Set(normalizedEins.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];
  if (!uniq.length) return { data: [], byEin: new Map(), error: null };
  const variants = [...new Set(uniq.flatMap((e) => [e, `${e.slice(0, 2)}-${e.slice(2)}`]))];
  const res = await supabase.from(DIRECTORY_SOURCE).select("*").in("ein", variants);
  if (res.error) return { data: [], byEin: new Map(), error: res.error };
  const byEin = new Map();
  for (const row of res.data || []) {
    const k = normalizeEinDigits(row?.ein);
    if (k.length === 9 && !byEin.has(k)) byEin.set(k, row);
  }
  return { data: uniq.map((k) => byEin.get(k)).filter(Boolean), byEin, error: null };
}
