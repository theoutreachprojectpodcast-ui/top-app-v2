const DIRECTORY_SOURCE = "nonprofits_search_app_v1";
const TRUSTED_PROFILES_SOURCE = "nonprofit_profiles";
const TRUSTED_ORGS_SOURCE = "nonprofits";

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
