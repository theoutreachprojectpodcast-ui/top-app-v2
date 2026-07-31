import { randomUUID } from "node:crypto";
import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";
import {
  listTrustedFavoriteKeysForUser,
  normalizeTrustedEntityKey,
  replaceTrustedFavoriteKeys,
} from "@/lib/savedOrganizations/savedOrganizationsService";

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
  const listed = await listTrustedFavoriteKeysForUser(admin, auth.user.id);
  const keys = listed.keys || [];
  logFavorites("get_ok", {
    correlationId,
    workosUserId: auth.user.id,
    profileId: listed.profileRow?.id || null,
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
  const keys = [
    ...new Set((Array.isArray(body?.keys) ? body.keys : []).map(normalizeTrustedEntityKey).filter(Boolean)),
  ].slice(0, 500);

  // Same entitlement as directory saves (Pro + active Support legacy + staff).
  const membership = await requireMembershipApi(admin, "save_organizations");
  if (!membership.ok) {
    logFavorites("put_denied", {
      correlationId,
      workosUserId: auth.user.id,
      status: membership.response?.status || 403,
    });
    return membership.response;
  }

  const result = await replaceTrustedFavoriteKeys(admin, {
    workosUserId: auth.user.id,
    profileId: membership.profileRow?.id || null,
    keys,
    correlationId,
  });
  if (!result.ok) {
    logFavorites("put_failed", {
      correlationId,
      workosUserId: auth.user.id,
      profileId: membership.profileRow?.id || null,
      reason: result.message || "update_failed",
    });
    return Response.json(
      { error: "update_failed", message: result.message || "Could not save favorites.", correlationId },
      { status: result.status || 500 },
    );
  }

  const remaining = Array.isArray(result.keys) ? result.keys : keys;
  logFavorites("put_ok", {
    correlationId,
    workosUserId: auth.user.id,
    profileId: membership.profileRow?.id || null,
    count: remaining.length,
    promotedEinCount: (result.promotedEins || []).length,
  });
  return Response.json({
    keys: remaining,
    promotedEins: result.promotedEins || [],
    correlationId,
  });
}
