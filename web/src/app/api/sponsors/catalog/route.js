import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import {
  getPublicSponsorCatalogRowBySlug,
  listSponsorsCatalogWithClient,
} from "@/features/sponsors/api/sponsorCatalogApi";

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
    const row = await getPublicSponsorCatalogRowBySlug(supabase, slug.trim());
    if (!row) return Response.json({ ok: true, row: null });
    return Response.json({ ok: true, row });
  }

  const rows = await listSponsorsCatalogWithClient(supabase, { sponsorScope: "app" });
  return Response.json({ ok: true, rows });
}
