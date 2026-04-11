import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import {
  listSponsorsCatalogWithClient,
  mergeSponsorEnrichmentForRows,
} from "@/features/sponsors/api/sponsorCatalogApi";
import { normalizeSponsorRecord } from "@/features/sponsors/domain/sponsorViewModels";

export const runtime = "nodejs";

export async function GET(request) {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return Response.json(
      { ok: false, error: "missing_supabase", message: "Set NEXT_PUBLIC_SUPABASE_URL and anon or service role key." },
      { status: 500 }
    );
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (slug?.trim()) {
    const { data, error } = await supabase.from("sponsors_catalog").select("*").eq("slug", slug.trim()).maybeSingle();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return Response.json({ ok: true, row: null });
    const [row] = await mergeSponsorEnrichmentForRows(supabase, [normalizeSponsorRecord(data)]);
    return Response.json({ ok: true, row });
  }

  const rows = await listSponsorsCatalogWithClient(supabase);
  return Response.json({ ok: true, rows });
}
