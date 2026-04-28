import { TRUSTED_PAGE_SIZE } from "@/lib/constants";
import {
  TRUSTED_RESOURCES_TABLE,
  isMissingTrustedResourcesTable,
  mapTrustedResourcesDbRowToTrustedRow,
} from "@/lib/supabase/trustedResourcesCatalog";
import { attachDirectoryAndEnrichmentToTrustedRows } from "@/features/trusted-resources/trustedDirectoryJoin";
import {
  TRUSTED_RESOURCE_CANONICAL_RECORDS,
  canonicalHostname,
  normalizeTrustedResourceEin,
} from "@/features/trusted-resources/trustedResourcesRegistry";

async function runQuery(factory) {
  try {
    return await factory();
  } catch (error) {
    return { data: null, error };
  }
}

function rowIdentityKey(row = {}) {
  const ein = normalizeTrustedResourceEin(row?.ein || "");
  if (ein) return `ein:${ein}`;
  const host = canonicalHostname(row?.website || "");
  if (host) return `host:${host}`;
  return `name:${String(row?.orgName || "").trim().toLowerCase()}`;
}

function registryRecordToTrustedRow(record = {}) {
  const ein = normalizeTrustedResourceEin(record?.eins?.[0] || "");
  const website = String(record.website || "").trim();
  const social = record.socialOverrides || {};
  return {
    ein,
    orgName: String(record.displayName || "").trim(),
    display_name: String(record.displayName || "").trim(),
    catalog_display_name: String(record.displayName || "").trim(),
    trustedResourceSlug: String(record.slug || "").trim(),
    website,
    logoUrl: "",
    city: "",
    state: "",
    ntee_code: String(record.ntee_code || "").trim(),
    nteeCode: String(record.ntee_code || "").trim(),
    nonprofit_type: String(record.nonprofit_type || "").trim(),
    description: String(record.shortDescription || "").trim(),
    trustedResourceDisplayLocation: String(record.locationLabel || "National").trim(),
    trustedResourceCategoryKey: String(record.trustedResourceCategoryKey || "").trim() || undefined,
    instagramUrl: String(social.instagramUrl || "").trim(),
    facebookUrl: String(social.facebookUrl || "").trim(),
    youtubeUrl: String(social.youtubeUrl || "").trim(),
    xUrl: String(social.xUrl || "").trim(),
    linkedinUrl: String(social.linkedinUrl || "").trim(),
    serves_veterans: true,
    serves_first_responders: false,
    isTrusted: true,
    is_trusted: true,
    is_trusted_resource: true,
    trusted_resource_status: "approved",
    listing_status: "active",
    raw: {
      profile: {
        ein,
        organization_name: String(record.displayName || "").trim(),
        display_name_override: String(record.displayName || "").trim(),
        website,
        nonprofit_type: String(record.nonprofit_type || "").trim(),
        description: String(record.shortDescription || "").trim(),
        ntee_code: String(record.ntee_code || "").trim(),
        is_trusted: true,
        is_trusted_resource: true,
        trusted_resource_status: "approved",
      },
      org: {},
    },
  };
}

function ensureAllCanonicalTrustedRows(rows = []) {
  const out = [...rows];
  const seen = new Set(out.map((r) => rowIdentityKey(r)));
  for (const rec of TRUSTED_RESOURCE_CANONICAL_RECORDS) {
    const candidate = registryRecordToTrustedRow(rec);
    const k = rowIdentityKey(candidate);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(candidate);
  }
  return out;
}

function buildCanonicalOrderedTrustedRows(rows = []) {
  const byEin = new Map();
  const byHost = new Map();
  for (const row of rows) {
    const ein = normalizeTrustedResourceEin(row?.ein || "");
    if (ein) byEin.set(ein, row);
    const host = canonicalHostname(row?.website || "");
    if (host) byHost.set(host, row);
  }

  return TRUSTED_RESOURCE_CANONICAL_RECORDS.map((rec) => {
    const hitEin = (rec.eins || [])
      .map((e) => normalizeTrustedResourceEin(e))
      .find((e) => e && byEin.has(e));
    if (hitEin) return byEin.get(hitEin);

    const primaryHost = canonicalHostname(rec.website || "");
    if (primaryHost && byHost.has(primaryHost)) return byHost.get(primaryHost);

    for (const alias of rec.aliasHosts || []) {
      const h = canonicalHostname(alias.includes("://") ? alias : `https://${alias}/`);
      if (h && byHost.has(h)) return byHost.get(h);
    }

    return registryRecordToTrustedRow(rec);
  });
}

/** Load trusted catalog + directory/enrichment joins (server or browser Supabase client). */
export async function fetchTrustedResourcesFromSupabase(supabase) {
  if (!supabase) return [];

  const catalog = await runQuery(() =>
    supabase
      .from(TRUSTED_RESOURCES_TABLE)
      .select("*")
      .eq("listing_status", "active")
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true })
  );
  if (!catalog.error && Array.isArray(catalog.data)) {
    const mapped = (catalog.data || []).map(mapTrustedResourcesDbRowToTrustedRow).filter((row) => {
      const ein = String(row?.ein ?? "").trim();
      const name = String(row?.orgName ?? "").trim();
      const web = String(row?.website ?? "").trim();
      return !!(ein || name || web);
    });
    const canonicalOnly = buildCanonicalOrderedTrustedRows(ensureAllCanonicalTrustedRows(mapped));
    return attachDirectoryAndEnrichmentToTrustedRows(supabase, canonicalOnly);
  }
  if (catalog.error && !isMissingTrustedResourcesTable(catalog.error)) {
    throw catalog.error;
  }

  // Catalog missing/empty: still return curated Trusted list (not directory/nonprofit-profile-derived list).
  const canonicalOnly = buildCanonicalOrderedTrustedRows(ensureAllCanonicalTrustedRows([]));
  return attachDirectoryAndEnrichmentToTrustedRows(supabase, canonicalOnly);
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

