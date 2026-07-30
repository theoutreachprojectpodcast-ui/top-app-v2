import { randomUUID } from "node:crypto";
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

function logFavorites(event, fields) {
  console.info(
    JSON.stringify({
      scope: "saved_favorites",
      event,
      ts: new Date().toISOString(),
      ...fields,
    }),
  );
}

export async function GET() {
  const correlationId = randomUUID();
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const admin = createSupabaseAdminClient();
  if (!admin) return Response.json({ keys: [], correlationId });
  const row = await getProfileRowByWorkOSId(admin, auth.user.id);
  const keys = listFromProfileRow(row);
  logFavorites("get_ok", {
    correlationId,
    workosUserId: auth.user.id,
    profileId: row?.id || null,
    count: keys.length,
  });
  return Response.json({ keys, correlationId });
}

export async function PUT(request) {
  const correlationId = randomUUID();
  const __guard = guardMutation(request, { rateKey: "me-favorites", limit: 40 });
  if (!__guard.ok) return guardFailureResponse(__guard);
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable", correlationId }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json", correlationId }, { status: 400 });
  }
  const keys = normalizedListFromBody(body);
  const membership = await requireMembershipApi(admin, "save_organizations");
  if (!membership.ok) {
    logFavorites("put_denied", {
      correlationId,
      workosUserId: auth.user.id,
      status: membership.response?.status || 403,
    });
    return membership.response;
  }
  const hasTrustedKey = keys.some((k) => k.startsWith("trusted:"));
  if (hasTrustedKey) {
    const proCheck = await requireMembershipApi(admin, "trusted_pro");
    if (!proCheck.ok) {
      logFavorites("put_trusted_denied", {
        correlationId,
        workosUserId: auth.user.id,
        profileId: membership.profileRow?.id || null,
      });
      return proCheck.response;
    }
  }
  const merged = await mergeProfileMetadataByWorkOSId(admin, auth.user.id, { favoriteEntityKeys: keys });
  if (!merged.ok) {
    logFavorites("put_failed", {
      correlationId,
      workosUserId: auth.user.id,
      profileId: membership.profileRow?.id || null,
      reason: merged.reason || "update_failed",
    });
    return Response.json(
      { error: "update_failed", message: merged.reason || "Could not save favorites.", correlationId },
      { status: 500 },
    );
  }
  logFavorites("put_ok", {
    correlationId,
    workosUserId: auth.user.id,
    profileId: membership.profileRow?.id || null,
    count: keys.length,
  });
  return Response.json({ keys, correlationId });
}
