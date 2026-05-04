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

  const scope = String(request.nextUrl.searchParams.get("scope") || "app").toLowerCase();
  const slug = request.nextUrl.searchParams.get("slug");
  if (slug?.trim()) {
    const slugScope = scope === "podcast" ? "podcast" : "app";
    let q = supabase.from("sponsors_catalog").select("*").eq("slug", slug.trim());
    if (slugScope === "podcast") {
      q = q
        .eq("sponsor_scope", "podcast")
        .eq("is_active", true)
        .in("payment_status", ["paid", "paid_stripe", "complete"]);
    } else {
      q = q.or("sponsor_scope.is.null,sponsor_scope.eq.app");
    }
    const { data, error } = await q.maybeSingle();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return Response.json({ ok: true, row: null });
    const [row] = await mergeSponsorEnrichmentForRows(supabase, [normalizeSponsorRecord(data)]);
    return Response.json({ ok: true, row });
  }

  const rows = await listSponsorsCatalogWithClient(supabase, { sponsorScope: scope });
  return Response.json({ ok: true, rows });
}
