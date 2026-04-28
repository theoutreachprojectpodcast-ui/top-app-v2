import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import { fetchTrustedResourcesFromSupabase } from "@/features/trusted-resources/api";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return Response.json(
      { ok: false, error: "missing_supabase", message: "Set NEXT_PUBLIC_SUPABASE_URL and anon or service role key." },
      { status: 500 }
    );
  }
  try {
    const rows = await fetchTrustedResourcesFromSupabase(supabase);
    return Response.json({ ok: true, rows });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
