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

export async function listSponsorsCatalog(supabase) {
  if (!supabase) return fallbackRows();
  const { data, error } = await supabase
    .from(SPONSOR_TABLE)
    .select("*")
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error || !Array.isArray(data) || !data.length) return fallbackRows();

  const rows = data.map((row) => normalizeSponsorRecord(row));
  const sponsorIds = rows.map((row) => row.id).filter(Boolean);
  if (!sponsorIds.length) return rows;

  const { data: enrichRows, error: enrichErr } = await supabase
    .from("sponsor_enrichment")
    .select("sponsor_id,canonical_display_name,source_summary,enrichment_status,last_enriched_at,review_required")
    .in("sponsor_id", sponsorIds);
  if (enrichErr || !Array.isArray(enrichRows) || !enrichRows.length) return rows;

  const byId = new Map(enrichRows.map((row) => [String(row.sponsor_id), row]));
  return rows.map((row) => {
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

export async function getSponsorBySlug(supabase, slug) {
  const key = String(slug || "").trim();
  if (!key) return null;
  if (!supabase) return fallbackRows().find((r) => r.slug === key) || null;
  const { data, error } = await supabase.from(SPONSOR_TABLE).select("*").eq("slug", key).maybeSingle();
  if (data && !error) return getSponsorProfileViewModel(data);
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

export function mapSponsorsToCardModels(rows = []) {
  return rows.map((row) => getSponsorCardViewModel(row));
}

export function mapSponsorsToAdminModels(rows = []) {
  return rows.map((row) => getSponsorAdminViewModel(row));
}
