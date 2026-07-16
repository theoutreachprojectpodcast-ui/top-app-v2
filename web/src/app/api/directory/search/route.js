import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import { fetchDirectorySearchWithSupabase } from "@/features/directory/api";

export const runtime = "nodejs";

/**
 * Public directory search — powers the home/directory experience without Pro Membership.
 * Favorites / saves remain Pro-gated via /api/me/saved-orgs.
 */
export async function POST(request) {
  const __guard = guardMutation(request, { rateKey: "directory-search", limit: 60 });
  if (!__guard.ok) return guardFailureResponse(__guard);

  const supabase = createSupabaseReadClient();
  if (!supabase) {
    return Response.json(
      { ok: false, error: "missing_supabase", message: "Set NEXT_PUBLIC_SUPABASE_URL and anon or service role key." },
      { status: 500 },
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
