import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";
import {
  nonprofitExistsForSave,
  resolveSavedOrganizationDirectoryRows,
} from "@/lib/savedOrganizations/resolveSavedOrganizations";

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

  // Reject brand-new EINs that do not exist in directory/enrichment/profile.
  // Keep already-saved EINs so users never lose legacy favorites during sync.
  const { data: existingRows, error: readErr } = await admin
    .from(SAVED_TABLE)
    .select("ein")
    .eq("user_id", user.id);
  if (readErr) {
    return Response.json({ error: "read_failed", message: readErr.message }, { status: 500 });
  }
  const existing = new Set(
    (existingRows || []).map((r) => normalizeEinDigits(r.ein)).filter((e) => e.length === 9),
  );

  const rejected = [];
  const accepted = [];
  for (const ein of list) {
    if (existing.has(ein)) {
      accepted.push(ein);
      continue;
    }
    const ok = await nonprofitExistsForSave(admin, ein);
    if (ok) accepted.push(ein);
    else rejected.push(ein);
  }
  if (rejected.length && !accepted.length && list.length) {
    return Response.json(
      {
        error: "nonprofit_not_found",
        message: "One or more organizations could not be saved because they are not in the directory.",
        rejectedEins: rejected,
      },
      { status: 400 },
    );
  }

  const next = new Set(accepted);
  const toRemove = [...existing].filter((e) => !next.has(e));
  if (toRemove.length) {
    const { error: delErr } = await admin.from(SAVED_TABLE).delete().eq("user_id", user.id).in("ein", toRemove);
    if (delErr) {
      return Response.json({ error: "delete_failed", message: delErr.message }, { status: 500 });
    }
  }
  if (!accepted.length) {
    return Response.json({ eins: [], rejectedEins: rejected });
  }
  const rows = accepted.map((ein, i) => ({
    user_id: user.id,
    ein,
    sort_order: i,
  }));
  const { error: upsErr } = await admin.from(SAVED_TABLE).upsert(rows, { onConflict: "user_id,ein" });
  if (upsErr) {
    return Response.json({ error: "upsert_failed", message: upsErr.message }, { status: 500 });
  }

  const resolvedRows = await resolveSavedOrganizationDirectoryRows(admin, accepted);
  return Response.json({
    eins: accepted,
    rejectedEins: rejected,
    rows: resolvedRows,
  });
}
