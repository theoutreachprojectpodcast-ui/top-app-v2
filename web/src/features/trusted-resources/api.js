import { TRUSTED_PAGE_SIZE } from "@/lib/constants";
import { mapTrustedRow } from "@/lib/supabase/mappers";
import {
  PROVEN_ALLIES_TABLE,
  isMissingProvenAlliesTable,
  mapProvenAlliesDbRowToTrustedRow,
} from "@/lib/supabase/provenAlliesCatalog";
import { queryTrustedOrgsByEin } from "@/lib/supabase/queries";
import { attachDirectoryAndEnrichmentToTrustedRows } from "@/features/trusted-resources/trustedDirectoryJoin";

async function runQuery(factory) {
  try {
    return await factory();
  } catch (error) {
    return { data: null, error };
  }
}

function normalizeEin(value) {
  let d = String(value ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 9) d = d.slice(-9);
  return d.padStart(9, "0");
}

function stripLeadingZeros(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/^0+/, "") || "0";
}

function normalizeDomain(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const full = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(full).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Load trusted catalog + directory/enrichment joins (server or browser Supabase client). */
export async function fetchTrustedResourcesFromSupabase(supabase) {
  if (!supabase) return [];

  const catalog = await runQuery(() =>
    supabase
      .from(PROVEN_ALLIES_TABLE)
      .select("*")
      .eq("listing_status", "active")
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true })
  );
  if (!catalog.error && Array.isArray(catalog.data)) {
    const mapped = (catalog.data || []).map(mapProvenAlliesDbRowToTrustedRow).filter((row) => {
      const ein = String(row?.ein ?? "").trim();
      const name = String(row?.orgName ?? "").trim();
      const web = String(row?.website ?? "").trim();
      return !!(ein || name || web);
    });
    return attachDirectoryAndEnrichmentToTrustedRows(supabase, mapped);
  }
  if (catalog.error && !isMissingProvenAlliesTable(catalog.error)) {
    throw catalog.error;
  }

  // Legacy: nonprofit_profiles + directory joins when `proven_allies` is not deployed.
  const profileResult = await runQuery(() => supabase.from("nonprofit_profiles").select("*").limit(1000));
  if (profileResult.error) throw profileResult.error;

  const featuredTiers = new Set(["featured", "featured_partner", "trusted", "trusted_partner", "tier_3"]);
  const profiles = (profileResult.data || []).filter((p) => {
    const tier = String(p?.verification_tier || "").trim().toLowerCase();
    const approved = String(p?.proven_ally_status || "").trim().toLowerCase() === "approved";
    return !!p?.ein && (p?.is_trusted === true || p?.is_proven_ally === true || approved || featuredTiers.has(tier));
  });
  if (!profiles.length) return [];
  const einKeys = new Set();
  for (const p of profiles) {
    const raw = String(p?.ein ?? "").trim();
    const normalized = normalizeEin(p?.ein);
    const unpadded = stripLeadingZeros(p?.ein);
    if (raw) einKeys.add(raw);
    if (normalized) einKeys.add(normalized);
    if (unpadded) einKeys.add(unpadded);
  }
  const eins = [...einKeys];

  const orgResult = await runQuery(() => queryTrustedOrgsByEin(supabase, eins));
  const orgRowsPrimary = orgResult?.error ? [] : (orgResult.data || []);
  const directoryResult = await runQuery(() =>
    supabase
      .from("nonprofits_search_app_v1")
      .select("ein,org_name,name,city,state,ntee_code,website,logo_url,verification_tier,verification_source,serves_veterans,serves_first_responders")
      .in("ein", eins)
  );
  const orgRowsDirectory = directoryResult?.error ? [] : (directoryResult.data || []);
  const orgRows = [...orgRowsPrimary, ...orgRowsDirectory];

  const orgMap = new Map();
  for (const org of orgRows) {
    const rawKey = String(org?.ein ?? "").trim();
    const normalizedKey = normalizeEin(org?.ein);
    if (rawKey) orgMap.set(rawKey, org);
    if (normalizedKey) orgMap.set(normalizedKey, org);
  }

  const rows = profiles
    .map((p) => {
      const rawKey = String(p?.ein ?? "").trim();
      const normalizedKey = normalizeEin(p?.ein);
      const unpaddedKey = stripLeadingZeros(p?.ein);
      const org = orgMap.get(rawKey) || orgMap.get(normalizedKey) || orgMap.get(unpaddedKey) || {};
      return mapTrustedRow(p, org);
    })
    .filter((row) => {
      const ein = String(row?.ein ?? "").trim();
      const name = String(row?.orgName ?? "").trim();
      const web = String(row?.website ?? "").trim();
      return !!(ein || name || web);
    })
    .sort((a, b) => {
      const sortKey = (r) =>
        String(r.orgName || "").trim() || String(r.ein || "").trim() || "\uFFFF";
      return sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: "base" });
    });

  // If many profile rows still don't resolve rich org fields, backfill from directory snapshot.
  const unresolved = rows.filter((r) => {
    const noRealName =
      !String(r.orgName || "").trim() ||
      /^unknown organization$/i.test(String(r.orgName || "").trim());
    return !r.city || !r.state || !r.nteeCode || noRealName;
  });
  if (unresolved.length) {
    const directorySnapshot = await runQuery(() =>
      supabase
        .from("nonprofits_search_app_v1")
        .select("ein,org_name,name,city,state,ntee_code,website,logo_url,verification_tier,verification_source,serves_veterans,serves_first_responders")
        .limit(20000)
    );
    const snapshotRows = directorySnapshot?.error ? [] : (directorySnapshot.data || []);
    const byEin = new Map();
    const byDomain = new Map();
    for (const org of snapshotRows) {
      const rawKey = String(org?.ein ?? "").trim();
      const normalizedKey = normalizeEin(org?.ein);
      const unpaddedKey = stripLeadingZeros(org?.ein);
      const domain = normalizeDomain(org?.website);
      if (rawKey) byEin.set(rawKey, org);
      if (normalizedKey) byEin.set(normalizedKey, org);
      if (unpaddedKey) byEin.set(unpaddedKey, org);
      if (domain) byDomain.set(domain, org);
    }

    return rows.map((row) => {
      const rawKey = String(row?.ein ?? "").trim();
      const normalizedKey = normalizeEin(row?.ein);
      const unpaddedKey = stripLeadingZeros(row?.ein);
      const domain = normalizeDomain(row?.website);
      const org = byEin.get(rawKey) || byEin.get(normalizedKey) || byEin.get(unpaddedKey) || byDomain.get(domain) || {};
      return mapTrustedRow(row?.raw?.profile || row, org);
    });
  }
  return rows;
}

async function fetchTrustedCatalogFromApi() {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/trusted/catalog", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.rows)) return null;
    return data.rows;
  } catch {
    return null;
  }
}

/**
 * Prefer GET /api/trusted/catalog in the browser so localhost can use the service role (same as enrichment)
 * when anon RLS blocks `nonprofit_directory_enrichment` or related tables.
 */
export async function fetchTrustedResources(supabase) {
  const fromApi = await fetchTrustedCatalogFromApi();
  if (fromApi) return fromApi;
  return fetchTrustedResourcesFromSupabase(supabase);
}

export function getTrustedSlice(rows, offset = 0) {
  return rows.slice(offset, offset + TRUSTED_PAGE_SIZE);
}

