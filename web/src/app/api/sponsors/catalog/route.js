import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import {
  filterAppSponsorRows,
  filterPublicSponsorDetailRows,
  listSponsorsCatalogWithClient,
  mergeSponsorCatalogRowWithSeed,
  mergeSponsorEnrichmentForRows,
} from "@/features/sponsors/api/sponsorCatalogApi";
import { normalizeSponsorRecord } from "@/features/sponsors/domain/sponsorViewModels";
import { isPublicSponsorRow } from "@/lib/sponsors/sponsorVisibility";

export const runtime = "nodejs";

export async function GET(request) {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return Response.json(
      { ok: false, error: "missing_supabase", message: "Set NEXT_PUBLIC_SUPABASE_URL and anon or service role key." },
      { status: 500 },
    );
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (slug?.trim()) {
    const slugKey = slug.trim();
    const { data, error } = await supabase
      .from("sponsors_catalog")
      .select("*")
      .eq("slug", slugKey)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    if (!data || !isPublicSponsorRow(data)) return Response.json({ ok: true, row: null });
    const mergedBase = mergeSponsorCatalogRowWithSeed(data) || normalizeSponsorRecord(data);
    const [row] = await mergeSponsorEnrichmentForRows(supabase, [mergedBase]);
    const [kept] = filterPublicSponsorDetailRows([row]);
    if (!kept) return Response.json({ ok: true, row: null });
    return Response.json({ ok: true, row: kept });
  }

  const rows = await listSponsorsCatalogWithClient(supabase, { sponsorScope: "app" });
  return Response.json({ ok: true, rows });
}
