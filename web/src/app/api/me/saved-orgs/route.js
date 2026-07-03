import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";

const SAVED_TABLE = process.env.NEXT_PUBLIC_SAVED_ORG_TABLE || "top_app_saved_org_eins";

export async function GET() {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const admin = createSupabaseAdminClient();
  if (admin) {
    const membership = await requireMembershipApi(admin, "save_organizations");
    if (!membership.ok) return membership.response;
  }
  const user = auth.user;
  if (!admin) {
    return Response.json({ eins: [] });
  }
  const { data, error } = await admin
    .from(SAVED_TABLE)
    .select("ein,sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) {
    return Response.json({ eins: [] });
  }
  const eins = [...new Set(data.map((r) => normalizeEinDigits(r.ein)).filter((e) => e.length === 9))];
  return Response.json({ eins });
}

export async function PUT(request) {
  const __guard = guardMutation(request, { rateKey: "me-saved-orgs", limit: 40 });
  if (!__guard.ok) return guardFailureResponse(__guard);
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }
  const membership = await requireMembershipApi(admin, "save_organizations");
  if (!membership.ok) return membership.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const raw = Array.isArray(body.eins) ? body.eins : [];
  const list = [...new Set(raw.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];

  const { error: delErr } = await admin.from(SAVED_TABLE).delete().eq("user_id", user.id);
  if (delErr) {
    return Response.json({ error: "delete_failed", message: delErr.message }, { status: 500 });
  }
  if (!list.length) {
    return Response.json({ eins: [] });
  }
  const rows = list.map((ein, i) => ({
    user_id: user.id,
    ein,
    sort_order: i,
  }));
  const { error: insErr } = await admin.from(SAVED_TABLE).insert(rows);
  if (insErr) {
    return Response.json({ error: "insert_failed", message: insErr.message }, { status: 500 });
  }
  return Response.json({ eins: list });
}
