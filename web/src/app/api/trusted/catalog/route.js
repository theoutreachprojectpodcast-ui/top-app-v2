import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import { fetchTrustedResourcesFromSupabase } from "@/features/trusted-resources/api";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseReadClient();
  try {
    const rows = await fetchTrustedResourcesFromSupabase(supabase);
    if (!supabase) {
      return Response.json({
        ok: true,
        rows,
        warning: "missing_supabase",
        message: "Set NEXT_PUBLIC_SUPABASE_URL plus anon or SUPABASE_SERVICE_ROLE_KEY for full catalog + directory enrichment.",
      });
    }
    return Response.json({ ok: true, rows });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
