import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import { listSponsorsCatalogWithClient } from "@/features/sponsors/api/sponsorCatalogApi";

export const runtime = "nodejs";

/** Podcast sponsor roster only — not the website `/sponsors` hub catalog. */
export async function GET() {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return Response.json(
      { ok: false, error: "missing_supabase", message: "Set NEXT_PUBLIC_SUPABASE_URL and anon or service role key." },
      { status: 500 },
    );
  }
  const rows = await listSponsorsCatalogWithClient(supabase, { sponsorScope: "podcast" });
  return Response.json({ ok: true, rows });
}
