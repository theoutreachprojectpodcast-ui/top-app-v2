import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { adminListConnections, mutateConnectionStatus } from "@/lib/community/memberConnections";

export const runtime = "nodejs";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const status = String(url.searchParams.get("status") || "").trim().toLowerCase();
  const q = String(url.searchParams.get("q") || "").trim();
  const limit = Number(url.searchParams.get("limit") || 100);

  try {
    const rows = await adminListConnections(ctx.admin, { status, q, limit });
    const profileIds = [
      ...new Set(rows.flatMap((r) => [r.requester_profile_id, r.recipient_profile_id]).filter(Boolean)),
    ];
    let profiles = {};
    if (profileIds.length) {
      const { data } = await ctx.admin
        .from("top_profiles")
        .select("id,first_name,last_name,display_name,email,workos_user_id")
        .in("id", profileIds);
      for (const row of data || []) {
        const name =
          [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
          String(row.display_name || "").trim() ||
          row.email ||
          "Member";
        profiles[row.id] = {
          id: row.id,
          name,
          email: row.email || "",
          workosUserId: row.workos_user_id || "",
        };
      }
    }

    const counts = { pending: 0, accepted: 0, blocked: 0, other: 0 };
    for (const row of rows) {
      const s = String(row.status || "");
      if (s === "pending") counts.pending += 1;
      else if (s === "accepted") counts.accepted += 1;
      else if (s === "blocked") counts.blocked += 1;
      else counts.other += 1;
    }

    return Response.json({
      ok: true,
      counts,
      connections: rows.map((row) => ({
        id: row.id,
        status: row.status,
        requesterProfileId: row.requester_profile_id,
        recipientProfileId: row.recipient_profile_id,
        requester: profiles[row.requester_profile_id] || null,
        recipient: profiles[row.recipient_profile_id] || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        respondedAt: row.responded_at,
        blockedByProfileId: row.blocked_by_profile_id || null,
      })),
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not load connections." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-community-connections", limit: 30 });
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = String(body.action || "").toLowerCase();
  const connectionId = String(body.connectionId || "").trim();
  const actingAsProfileId = String(body.actingAsProfileId || "").trim();

  if (action !== "remove" && action !== "cancel") {
    return Response.json({ ok: false, error: "unsupported_action" }, { status: 400 });
  }
  if (!connectionId || !actingAsProfileId) {
    return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  let result;
  if (action === "remove") {
    // Admin force-clear: accepted → removed, blocked → removed, pending → cancelled.
    const { data: existing } = await ctx.admin
      .from("member_connections")
      .select("*")
      .eq("id", connectionId)
      .maybeSingle();
    if (existing && ["accepted", "blocked", "pending"].includes(String(existing.status))) {
      const now = new Date().toISOString();
      const next = String(existing.status) === "pending" ? "cancelled" : "removed";
      const { data, error } = await ctx.admin
        .from("member_connections")
        .update({ status: next, updated_at: now, responded_at: now, blocked_by_profile_id: null })
        .eq("id", connectionId)
        .select("*")
        .maybeSingle();
      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
      }
      result = { ok: true, message: next === "cancelled" ? "Request cancelled." : "Connection removed.", state: "none", row: data };
    } else {
      result = await mutateConnectionStatus(ctx.admin, {
        viewerProfileId: actingAsProfileId,
        connectionId,
        as: "remove",
      });
    }
  } else {
    result = await mutateConnectionStatus(ctx.admin, {
      viewerProfileId: actingAsProfileId,
      connectionId,
      as: action,
    });
  }

  if (!result.ok) {
    return Response.json({ ok: false, error: result.message || "update_failed" }, { status: 400 });
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: ctx.user?.id,
    actorEmail: ctx.user?.email,
    action: `community_connection_${action}`,
    resourceType: "member_connection",
    resourceId: connectionId,
    metadata: { actingAsProfileId, status: result.state },
  });

  return Response.json({ ok: true, message: result.message, state: result.state });
}
