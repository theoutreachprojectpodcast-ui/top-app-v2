import { randomUUID } from "node:crypto";
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

function logSavedOrgs(event, fields) {
  console.info(
    JSON.stringify({
      scope: "saved_orgs",
      event,
      ts: new Date().toISOString(),
      ...fields,
    }),
  );
}

async function listEinsForUser(admin, workosUserId) {
  const { data, error } = await admin
    .from(SAVED_TABLE)
    .select("ein,sort_order")
    .eq("user_id", workosUserId)
    .order("sort_order", { ascending: true });
  if (error) return { ok: false, error, eins: [] };
  const eins = [
    ...new Set((data || []).map((r) => normalizeEinDigits(r.ein)).filter((e) => e.length === 9)),
  ];
  return { ok: true, eins };
}

export async function GET() {
  const correlationId = randomUUID();
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const admin = createSupabaseAdminClient();
  if (admin) {
    const membership = await requireMembershipApi(admin, "save_organizations");
    if (!membership.ok) {
      logSavedOrgs("get_denied", {
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
  const listed = await listEinsForUser(admin, user.id);
  if (!listed.ok) {
    logSavedOrgs("get_failed", {
      correlationId,
      workosUserId: user.id,
      dbError: listed.error?.code || listed.error?.message || "empty",
    });
    // Do not soft-return [] — clients treat empty as authoritative wipe.
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
  logSavedOrgs("get_ok", {
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
    logSavedOrgs("toggle_denied", {
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
  const ein = normalizeEinDigits(body?.ein);
  if (ein.length !== 9) {
    return Response.json(
      { error: "invalid_ein", message: "A valid 9-digit EIN is required.", correlationId, mutationId },
      { status: 400 },
    );
  }
  if (action !== "save" && action !== "unsave") {
    return Response.json(
      { error: "invalid_action", message: 'action must be "save" or "unsave".', correlationId, mutationId },
      { status: 400 },
    );
  }

  if (action === "unsave") {
    const { error: delErr } = await admin.from(SAVED_TABLE).delete().eq("user_id", user.id).eq("ein", ein);
    if (delErr) {
      logSavedOrgs("toggle_unsave_failed", {
        correlationId,
        mutationId,
        workosUserId: user.id,
        profileId,
        organizationId: ein,
        dbError: delErr.code || delErr.message,
      });
      return Response.json(
        { error: "delete_failed", message: delErr.message, correlationId, mutationId },
        { status: 500 },
      );
    }
    const listed = await listEinsForUser(admin, user.id);
    logSavedOrgs("toggle_unsave_ok", {
      correlationId,
      mutationId,
      workosUserId: user.id,
      profileId,
      organizationId: ein,
      entityType: "nonprofit_ein",
      action: "unsave",
      count: listed.eins.length,
    });
    return Response.json({
      ok: true,
      saved: false,
      ein,
      eins: listed.ok ? listed.eins : [],
      correlationId,
      mutationId,
    });
  }

  // save
  const exists = await nonprofitExistsForSave(admin, ein);
  if (!exists) {
    logSavedOrgs("toggle_save_rejected", {
      correlationId,
      mutationId,
      workosUserId: user.id,
      profileId,
      organizationId: ein,
      entityType: "nonprofit_ein",
      action: "save",
    });
    return Response.json(
      {
        error: "nonprofit_not_found",
        message: "This organization could not be saved because it is not in the directory.",
        rejectedEins: [ein],
        correlationId,
        mutationId,
      },
      { status: 400 },
    );
  }

  const listedBefore = await listEinsForUser(admin, user.id);
  const sortOrder = listedBefore.ok ? listedBefore.eins.length : 0;
  const { error: upsErr } = await admin.from(SAVED_TABLE).upsert(
    {
      user_id: user.id,
      ein,
      sort_order: sortOrder,
      ...(profileId ? { profile_id: profileId } : {}),
    },
    { onConflict: "user_id,ein" },
  );
  if (upsErr) {
    // profile_id column may not exist yet — retry without it.
    const missingCol =
      String(upsErr.message || "").toLowerCase().includes("profile_id") ||
      String(upsErr.code || "") === "PGRST204";
    if (missingCol) {
      const { error: upsErr2 } = await admin.from(SAVED_TABLE).upsert(
        { user_id: user.id, ein, sort_order: sortOrder },
        { onConflict: "user_id,ein" },
      );
      if (upsErr2) {
        logSavedOrgs("toggle_save_failed", {
          correlationId,
          mutationId,
          workosUserId: user.id,
          profileId,
          organizationId: ein,
          dbError: upsErr2.code || upsErr2.message,
        });
        return Response.json(
          { error: "upsert_failed", message: upsErr2.message, correlationId, mutationId },
          { status: 500 },
        );
      }
    } else {
      logSavedOrgs("toggle_save_failed", {
        correlationId,
        mutationId,
        workosUserId: user.id,
        profileId,
        organizationId: ein,
        dbError: upsErr.code || upsErr.message,
      });
      return Response.json(
        { error: "upsert_failed", message: upsErr.message, correlationId, mutationId },
        { status: 500 },
      );
    }
  }

  const listed = await listEinsForUser(admin, user.id);
  const resolvedRows = await resolveSavedOrganizationDirectoryRows(admin, [ein]);
  logSavedOrgs("toggle_save_ok", {
    correlationId,
    mutationId,
    workosUserId: user.id,
    profileId,
    organizationId: ein,
    entityType: "nonprofit_ein",
    action: "save",
    count: listed.eins.length,
  });
  return Response.json({
    ok: true,
    saved: true,
    ein,
    eins: listed.ok ? listed.eins : [ein],
    rows: resolvedRows,
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
    logSavedOrgs("put_denied", {
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
  const raw = Array.isArray(body.eins) ? body.eins : [];
  const list = [...new Set(raw.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];

  const { data: existingRows, error: readErr } = await admin
    .from(SAVED_TABLE)
    .select("ein")
    .eq("user_id", user.id);
  if (readErr) {
    logSavedOrgs("put_read_failed", {
      correlationId,
      workosUserId: user.id,
      profileId,
      dbError: readErr.code || readErr.message,
    });
    return Response.json({ error: "read_failed", message: readErr.message, correlationId }, { status: 500 });
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
    logSavedOrgs("put_all_rejected", {
      correlationId,
      workosUserId: user.id,
      profileId,
      rejectedCount: rejected.length,
      rejectedEins: rejected.slice(0, 20),
    });
    return Response.json(
      {
        error: "nonprofit_not_found",
        message: "One or more organizations could not be saved because they are not in the directory.",
        rejectedEins: rejected,
        correlationId,
      },
      { status: 400 },
    );
  }

  const next = new Set(accepted);
  const toRemove = [...existing].filter((e) => !next.has(e));
  if (toRemove.length) {
    const { error: delErr } = await admin.from(SAVED_TABLE).delete().eq("user_id", user.id).in("ein", toRemove);
    if (delErr) {
      logSavedOrgs("put_delete_failed", {
        correlationId,
        workosUserId: user.id,
        profileId,
        dbError: delErr.code || delErr.message,
      });
      return Response.json({ error: "delete_failed", message: delErr.message, correlationId }, { status: 500 });
    }
  }
  if (!accepted.length) {
    logSavedOrgs("put_cleared", {
      correlationId,
      workosUserId: user.id,
      profileId,
      rejectedCount: rejected.length,
    });
    return Response.json({ eins: [], rejectedEins: rejected, correlationId });
  }
  const rows = accepted.map((ein, i) => ({
    user_id: user.id,
    ein,
    sort_order: i,
  }));
  const { error: upsErr } = await admin.from(SAVED_TABLE).upsert(rows, { onConflict: "user_id,ein" });
  if (upsErr) {
    logSavedOrgs("put_upsert_failed", {
      correlationId,
      workosUserId: user.id,
      profileId,
      dbError: upsErr.code || upsErr.message,
    });
    return Response.json({ error: "upsert_failed", message: upsErr.message, correlationId }, { status: 500 });
  }

  const resolvedRows = await resolveSavedOrganizationDirectoryRows(admin, accepted);
  logSavedOrgs("put_ok", {
    correlationId,
    workosUserId: user.id,
    profileId,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    removedCount: toRemove.length,
  });
  return Response.json({
    eins: accepted,
    rejectedEins: rejected,
    rows: resolvedRows,
    correlationId,
  });
}
