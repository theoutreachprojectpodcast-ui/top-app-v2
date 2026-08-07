import { randomUUID } from "node:crypto";
import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";
import {
  listSavedEinsForUser,
  logSavedOrgEvent,
  replaceSavedEinsForUser,
  saveOrganizationByEin,
  unsaveOrganizationByEin,
} from "@/lib/savedOrganizations/savedOrganizationsService";

export async function GET() {
  const correlationId = randomUUID();
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const admin = createSupabaseAdminClient();
  if (admin) {
    const membership = await requireMembershipApi(admin, "save_organizations");
    if (!membership.ok) {
      logSavedOrgEvent("get_denied", {
        correlationId,
        workosUserId: auth.user?.id || null,
        status: membership.response?.status || 403,
      });
      return membership.response;
    }
  }
  const user = auth.user;
  if (!admin) {
    return Response.json({ ok: true, eins: [], correlationId });
  }
  const listed = await listSavedEinsForUser(admin, user.id);
  if (!listed.ok) {
    logSavedOrgEvent("get_failed", {
      correlationId,
      workosUserId: user.id,
      dbError: listed.error?.code || listed.error?.message || "empty",
    });
    return Response.json(
      {
        ok: false,
        error: "read_failed",
        message: listed.error?.message || "Could not load saved organizations.",
        correlationId,
      },
      { status: 500 },
    );
  }
  logSavedOrgEvent("get_ok", {
    correlationId,
    workosUserId: user.id,
    count: listed.eins.length,
  });
  return Response.json({ ok: true, eins: listed.eins, correlationId });
}

/**
 * Idempotent single-EIN save / unsave.
 * Body: { action: "save" | "unsave", ein: string }
 */
export async function POST(request) {
  const correlationId = randomUUID();
  const mutationId = randomUUID();
  const __guard = guardMutation(request, { rateKey: "me-saved-orgs-toggle", limit: 60 });
  if (!__guard.ok) return guardFailureResponse(__guard);
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable", correlationId, mutationId }, { status: 503 });
  }
  const membership = await requireMembershipApi(admin, "save_organizations");
  if (!membership.ok) {
    logSavedOrgEvent("toggle_denied", {
      correlationId,
      mutationId,
      workosUserId: user.id,
      status: membership.response?.status || 403,
    });
    return membership.response;
  }
  const profileId = membership.profileRow?.id || null;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json", correlationId, mutationId }, { status: 400 });
  }

  const action = String(body?.action || "").trim().toLowerCase();
  if (action !== "save" && action !== "unsave") {
    return Response.json(
      { error: "invalid_action", message: 'action must be "save" or "unsave".', correlationId, mutationId },
      { status: 400 },
    );
  }

  const result =
    action === "unsave"
      ? await unsaveOrganizationByEin(admin, {
          workosUserId: user.id,
          profileId,
          ein: body?.ein,
          correlationId,
          mutationId,
        })
      : await saveOrganizationByEin(admin, {
          workosUserId: user.id,
          profileId,
          ein: body?.ein,
          correlationId,
          mutationId,
        });

  if (!result.ok) {
    const error =
      result.code === "organization_not_found"
        ? "nonprofit_not_found"
        : result.code === "invalid_ein"
          ? "invalid_ein"
          : result.code === "database_write_failed"
            ? action === "unsave"
              ? "delete_failed"
              : "upsert_failed"
            : result.code || "save_failed";
    return Response.json(
      {
        error,
        message: result.message,
        rejectedEins: result.rejectedEins,
        correlationId,
        mutationId,
      },
      { status: result.status || 500 },
    );
  }

  return Response.json({
    ok: true,
    saved: result.saved,
    ein: result.ein,
    eins: result.eins,
    rows: result.rows,
    duplicateResolved: !!result.duplicateResolved,
    correlationId,
    mutationId,
  });
}

export async function PUT(request) {
  const correlationId = randomUUID();
  const __guard = guardMutation(request, { rateKey: "me-saved-orgs", limit: 40 });
  if (!__guard.ok) return guardFailureResponse(__guard);
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable", correlationId }, { status: 503 });
  }
  const membership = await requireMembershipApi(admin, "save_organizations");
  if (!membership.ok) {
    logSavedOrgEvent("put_denied", {
      correlationId,
      workosUserId: user.id,
      profileId: null,
      status: membership.response?.status || 403,
    });
    return membership.response;
  }
  const profileId = membership.profileRow?.id || null;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json", correlationId }, { status: 400 });
  }

  const result = await replaceSavedEinsForUser(admin, {
    workosUserId: user.id,
    profileId,
    eins: Array.isArray(body.eins) ? body.eins : [],
    correlationId,
  });

  if (!result.ok) {
    const error =
      result.code === "organization_not_found"
        ? "nonprofit_not_found"
        : result.code === "database_write_failed"
          ? String(result.message || "").toLowerCase().includes("delete")
            ? "delete_failed"
            : "upsert_failed"
          : result.code === "saved_state_unavailable"
            ? "read_failed"
            : result.code || "save_failed";
    return Response.json(
      {
        error,
        message: result.message,
        rejectedEins: result.rejectedEins,
        correlationId,
      },
      { status: result.status || 500 },
    );
  }

  return Response.json({
    eins: result.eins,
    rejectedEins: result.rejectedEins,
    rows: result.rows,
    correlationId,
  });
}
