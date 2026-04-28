import { FEATURED_SPONSORS } from "@/features/sponsors/data/featuredSponsors";
import {
  getSponsorAdminViewModel,
  getSponsorCardViewModel,
  getSponsorProfileViewModel,
  normalizeSponsorRecord,
} from "@/features/sponsors/domain/sponsorViewModels";

const SPONSOR_TABLE = "sponsors_catalog";

function fallbackRows() {
  return FEATURED_SPONSORS.map((item, idx) =>
    normalizeSponsorRecord({
      ...item,
      id: item.id,
      slug: item.id,
      name: item.name,
      sponsor_type: item.industry,
      website_url: item.ctaUrl,
      logo_url: item.logoUrl,
      background_image_url: item.backgroundImageUrl,
      short_description: item.tag,
      long_description: item.tagline,
      tagline: item.tagline,
      featured: true,
      display_order: idx + 1,
      enrichment_status: "seed",
      verified: true,
    }),
  );
}

/**
 * Merge `sponsor_enrichment` titles/descriptions onto normalized catalog rows (server or browser).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {ReturnType<normalizeSponsorRecord>[]} normalizedRows
 */
export async function mergeSponsorEnrichmentForRows(supabase, normalizedRows) {
  const sponsorIds = normalizedRows.map((row) => row.id).filter(Boolean);
  if (!sponsorIds.length) return normalizedRows;

  const { data: enrichRows, error: enrichErr } = await supabase
    .from("sponsor_enrichment")
    .select(
      "sponsor_id,canonical_display_name,extracted_site_title,extracted_meta_description,source_summary,enrichment_status,last_enriched_at,review_required"
    )
    .in("sponsor_id", sponsorIds);
  if (enrichErr || !Array.isArray(enrichRows) || !enrichRows.length) return normalizedRows;

  const byId = new Map(enrichRows.map((row) => [String(row.sponsor_id), row]));
  return normalizedRows.map((row) => {
    const enrich = byId.get(String(row.id));
    if (!enrich) return row;
    const extTitle = String(enrich.extracted_site_title || "").trim();
    const extDesc = String(enrich.extracted_meta_description || "").trim();
    return normalizeSponsorRecord({
      ...row,
      name: enrich.canonical_display_name || row.name,
      short_description: String(row.short_description || "").trim() || extDesc || row.short_description,
      long_description: String(row.long_description || "").trim() || extDesc || row.long_description,
      tagline: String(row.tagline || "").trim() || extTitle || row.tagline,
      enrichment_status: enrich.enrichment_status || row.enrichment_status,
      last_enriched_at: enrich.last_enriched_at || row.last_enriched_at,
    });
  });
}

/** Load sponsors from Supabase (no HTTP proxy). Used by API routes with the service role. */
export async function listSponsorsCatalogWithClient(supabase) {
  if (!supabase) return fallbackRows();
  const { data, error } = await supabase
    .from(SPONSOR_TABLE)
    .select("*")
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error || !Array.isArray(data) || !data.length) return fallbackRows();

  const rows = data.map((row) => normalizeSponsorRecord(row));
  return mergeSponsorEnrichmentForRows(supabase, rows);
}

async function fetchSponsorsCatalogFromApi() {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/sponsors/catalog", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.rows)) return null;
    return data.rows.map((r) => normalizeSponsorRecord(r));
  } catch {
    return null;
  }
}

export async function listSponsorsCatalog(supabase) {
  const fromApi = await fetchSponsorsCatalogFromApi();
  if (fromApi) return fromApi;
  return listSponsorsCatalogWithClient(supabase);
}

export async function getSponsorBySlug(supabase, slug) {
  const key = String(slug || "").trim();
  if (!key) return null;
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/sponsors/catalog?slug=${encodeURIComponent(key)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data.row) return getSponsorProfileViewModel(data.row);
      }
    } catch {
      /* fall through */
    }
  }
  if (!supabase) return getSponsorProfileViewModel(fallbackRows().find((r) => r.slug === key) || null);
  const { data, error } = await supabase.from(SPONSOR_TABLE).select("*").eq("slug", key).maybeSingle();
  if (data && !error) {
    const [merged] = await mergeSponsorEnrichmentForRows(supabase, [normalizeSponsorRecord(data)]);
    return getSponsorProfileViewModel(merged);
  }
  return getSponsorProfileViewModel(fallbackRows().find((r) => r.slug === key) || null);
}

export async function saveSponsorAdminRecord(supabase, payload) {
  const row = normalizeSponsorRecord(payload);
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };
  const { error } = await supabase.from(SPONSOR_TABLE).upsert(row, { onConflict: "slug" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function runSponsorEnrichment(slug) {
  const res = await fetch("/api/sponsors/enrich", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || data?.message || "Enrichment failed." };
  return { ok: true, row: data?.row || null };
}

/** Moderator-only: official-site logo discovery → storage (see /api/admin/sponsors/logo-enrichment). */
export async function runSponsorLogoEnrichment(slug, { force = false, batch = false, limit = 8 } = {}) {
  const res = await fetch("/api/admin/sponsors/logo-enrichment", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batch ? { mode: "batch", limit, delayMs: 450, force } : { slug, force }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || data?.message || "Logo enrichment failed." };
  return { ok: true, ...data };
}

export function mapSponsorsToCardModels(rows = []) {
  return rows.map((row) => getSponsorCardViewModel(row));
}

export function mapSponsorsToAdminModels(rows = []) {
  return rows.map((row) => getSponsorAdminViewModel(row));
}
