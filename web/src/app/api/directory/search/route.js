import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import { fetchDirectorySearchWithSupabase } from "@/features/directory/api";

export const runtime = "nodejs";

export async function POST(request) {
  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return Response.json(
      { ok: false, error: "missing_supabase", message: "Set NEXT_PUBLIC_SUPABASE_URL and anon or service role key." },
      { status: 500 }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const filters = body?.filters && typeof body.filters === "object" ? body.filters : {};
  const page = Math.max(1, Number(body?.page) || 1);

  try {
    const { rows, count, from } = await fetchDirectorySearchWithSupabase(supabase, filters, page);
    return Response.json({ ok: true, rows, count, from });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
