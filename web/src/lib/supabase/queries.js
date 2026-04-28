import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

const DIRECTORY_SOURCE = "nonprofits_search_app_v1";
const TRUSTED_PROFILES_SOURCE = "nonprofit_profiles";
const TRUSTED_ORGS_SOURCE = "nonprofits";
const DIRECTORY_ENRICHMENT_SOURCE = "nonprofit_directory_enrichment";

export function applyDirectoryFilters(query, filters) {
  let q = query.eq("state", filters.state);

  if ((filters.q || "").trim()) {
    const term = String(filters.q).replace(/,/g, " ").trim();
    q = q.or(`org_name.ilike.%${term}%,city.ilike.%${term}%`);
  }

  if (filters.service) q = q.ilike("ntee_code", `${filters.service}%`);
  if (filters.audience === "veteran") q = q.eq("serves_veterans", true);
  if (filters.audience === "first_responder") q = q.eq("serves_first_responders", true);

  return q;
}

export async function queryDirectoryPage(supabase, filters, from, to) {
  let query = supabase.from(DIRECTORY_SOURCE).select("*").range(from, to);
  query = applyDirectoryFilters(query, filters);
  return query;
}

export async function queryDirectoryCount(supabase, filters) {
  let query = supabase.from(DIRECTORY_SOURCE).select("*", { count: "exact", head: true });
  query = applyDirectoryFilters(query, filters);
  return query;
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

/** Normalized 9-digit EINs only */
export async function queryDirectoryEnrichmentByEins(supabase, normalizedEins = []) {
  if (!normalizedEins.length) return { data: [], error: null };
  return supabase.from(DIRECTORY_ENRICHMENT_SOURCE).select("*").in("ein", normalizedEins);
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
