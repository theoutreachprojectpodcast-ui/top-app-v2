import { PAGE_SIZE } from "@/lib/constants";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { mergeDirectoryRowWithEnrichment, enrichmentRowsByEin } from "@/lib/supabase/enrichmentMerge";
import { mapDirectoryRow } from "@/lib/supabase/mappers";
import {
  queryDirectoryCount,
  queryDirectoryEnrichmentByEin,
  queryDirectoryEnrichmentByEins,
  queryDirectoryOrgByEin,
  queryDirectoryPage,
} from "@/lib/supabase/queries";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";

async function fetchLegacyDirectoryPage(supabase, filters, from, to) {
  let query = supabase.from("nonprofits").select("*").range(from, to);
  if ((filters.state || "").trim()) query = query.eq("state", filters.state);
  if ((filters.q || "").trim()) {
    const term = String(filters.q).replace(/,/g, " ").trim();
    query = query.or(`name.ilike.%${term}%,city.ilike.%${term}%`);
  }
  if (filters.service) query = query.ilike("ntee_code", `${filters.service}%`);
  if (filters.audience === "veteran") query = query.eq("serves_veterans", true);
  if (filters.audience === "first_responder") query = query.eq("serves_first_responders", true);
  return query;
}

async function fetchLegacyDirectoryCount(supabase, filters) {
  let query = supabase.from("nonprofits").select("*", { count: "exact", head: true });
  if ((filters.state || "").trim()) query = query.eq("state", filters.state);
  if ((filters.q || "").trim()) {
    const term = String(filters.q).replace(/,/g, " ").trim();
    query = query.or(`name.ilike.%${term}%,city.ilike.%${term}%`);
  }
  if (filters.service) query = query.ilike("ntee_code", `${filters.service}%`);
  if (filters.audience === "veteran") query = query.eq("serves_veterans", true);
  if (filters.audience === "first_responder") query = query.eq("serves_first_responders", true);
  return query;
}

export async function fetchDirectorySearch(supabase, filters, page = 1) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let pageResult = await queryDirectoryPage(supabase, filters, from, to);
  if (pageResult.error) {
    // Fallback for environments where the app-specific search view is unavailable.
    const legacyResult = await fetchLegacyDirectoryPage(supabase, filters, from, to);
    if (legacyResult.error) throw pageResult.error;
    pageResult = legacyResult;
  }

  const rawRows = (pageResult.data || []).filter((r) => normalizeEinDigits(r?.ein).length === 9);
  const einKeys = [...new Set(rawRows.map((r) => normalizeEinDigits(r?.ein)).filter((k) => k.length === 9))];

  let enrichMap = new Map();
  if (einKeys.length) {
    const { data: enrichData, error: enrichError } = await queryDirectoryEnrichmentByEins(supabase, einKeys);
    if (enrichError && typeof console !== "undefined" && console.warn) {
      console.warn("[directory] nonprofit_directory_enrichment unavailable:", enrichError.message);
    }
    if (!enrichError && enrichData?.length) enrichMap = enrichmentRowsByEin(enrichData);
  }

  const rows = rawRows
    .map((r) => {
      const key = normalizeEinDigits(r?.ein);
      const merged = mergeDirectoryRowWithEnrichment(r, enrichMap.get(key));
      return mapDirectoryRow(merged);
    })
    .filter((mapped) => mapped.einIdentityVerified);

  let countResult = await queryDirectoryCount(supabase, filters);
  if (countResult.error) {
    const legacyCount = await fetchLegacyDirectoryCount(supabase, filters);
    if (!legacyCount.error) countResult = legacyCount;
  }
  const count = countResult.error ? null : countResult.count;

  return {
    rows,
    count: typeof count === "number" ? count : null,
    from,
  };
}

/**
 * Full nonprofit profile for detail route: directory row + enrichment, mapped to card + extended fields.
 */
export async function fetchNonprofitProfileDetail(supabase, einParam) {
  const { data: org, error: orgError } = await queryDirectoryOrgByEin(supabase, einParam);
  if (orgError) return { error: orgError, card: null };
  if (!org) return { error: null, card: null };

  const key = normalizeEinDigits(org.ein);
  if (key.length !== 9) {
    return { error: null, card: null, mergeBase: null, identityRejected: true };
  }

  let enrichment = null;
  const { data: en, error: enError } = await queryDirectoryEnrichmentByEin(supabase, key);
  if (!enError) enrichment = en;
  else if (typeof console !== "undefined" && console.warn) {
    console.warn("[directory] enrichment row skipped:", enError.message);
  }

  const merged = mergeDirectoryRowWithEnrichment(org, enrichment);
  if (merged.ein_identity_verified === false) {
    return { error: null, card: null, mergeBase: null, identityRejected: true };
  }

  const mapped = mapDirectoryRow(merged);
  const card = mapNonprofitCardRow(mapped, "directory");
  return { error: null, card, mapped, mergeBase: merged, identityRejected: false };
}
