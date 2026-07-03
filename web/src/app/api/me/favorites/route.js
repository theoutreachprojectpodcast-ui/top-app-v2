import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, mergeProfileMetadataByWorkOSId } from "@/lib/profile/serverProfile";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";

function normalizeFavoriteKey(raw) {
  const text = String(raw || "").trim().toLowerCase();
  if (!text) return "";
  if (!/^[a-z0-9:_-]+$/.test(text)) return "";
  if (text.startsWith("trusted:")) return text.slice(0, 180);
  return "";
}

function normalizedListFromBody(body) {
  const raw = Array.isArray(body?.keys) ? body.keys : [];
  return [...new Set(raw.map(normalizeFavoriteKey).filter(Boolean))].slice(0, 500);
}

function listFromProfileRow(row) {
  const meta = row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
  const raw = Array.isArray(meta.favoriteEntityKeys) ? meta.favoriteEntityKeys : [];
  return [...new Set(raw.map(normalizeFavoriteKey).filter(Boolean))];
}

export async function GET() {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const admin = createSupabaseAdminClient();
  if (!admin) return Response.json({ keys: [] });
  const row = await getProfileRowByWorkOSId(admin, auth.user.id);
  return Response.json({ keys: listFromProfileRow(row) });
}

export async function PUT(request) {
  const __guard = guardMutation(request, { rateKey: "me-favorites", limit: 40 });
  if (!__guard.ok) return guardFailureResponse(__guard);
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const keys = normalizedListFromBody(body);
  const membership = await requireMembershipApi(admin, "save_organizations");
  if (!membership.ok) return membership.response;
  const hasTrustedKey = keys.some((k) => k.startsWith("trusted:"));
  if (hasTrustedKey) {
    const proCheck = await requireMembershipApi(admin, "trusted_pro");
    if (!proCheck.ok) return proCheck.response;
  }
  const merged = await mergeProfileMetadataByWorkOSId(admin, auth.user.id, { favoriteEntityKeys: keys });
  if (!merged.ok) {
    return Response.json({ error: "update_failed", message: merged.reason || "Could not save favorites." }, { status: 500 });
  }
  return Response.json({ keys });
}
