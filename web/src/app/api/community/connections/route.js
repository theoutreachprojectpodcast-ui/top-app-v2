import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";
import {
  acceptConnectionRequest,
  connectionStateForUi,
  listConnectionsForViewer,
  mutateConnectionStatus,
  sendConnectionRequest,
  viewerConnectionState,
} from "@/lib/community/memberConnections";
import { createNotificationDeduped } from "@/server/notifications/notificationService";

function profileSummary(row) {
  if (!row) return null;
  const name =
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    String(row.display_name || "").trim() ||
    "Member";
  return {
    id: row.id,
    name,
    avatar_url: row.profile_photo_url || "",
    role: row.role_title || row.occupation || "",
    location: [row.city, row.state].filter(Boolean).join(", "),
  };
}

function displayNameFromProfile(row) {
  if (!row) return "A community member";
  return (
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    String(row.display_name || "").trim() ||
    "A community member"
  );
}

async function loadProfilesByIds(admin, ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!unique.length) return new Map();
  const { data, error } = await admin
    .from("top_profiles")
    .select("id,first_name,last_name,display_name,profile_photo_url,role_title,occupation,city,state")
    .in("id", unique);
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) map.set(String(row.id), row);
  return map;
}

function serializeConnection(row, viewerProfileId, profiles) {
  const otherId =
    String(row.requester_profile_id) === String(viewerProfileId)
      ? String(row.recipient_profile_id)
      : String(row.requester_profile_id);
  const state = viewerConnectionState(row, viewerProfileId);
  return {
    id: row.id,
    status: row.status,
    state,
    uiState: connectionStateForUi(state),
    otherProfileId: otherId,
    other: profileSummary(profiles.get(otherId)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at,
  };
}

function logConnectionFailure(action, err, meta = {}) {
  console.error("[community/connections]", {
    action,
    message: err instanceof Error ? err.message : String(err || "unknown"),
    ...meta,
  });
}

export async function GET() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }

  const gate = await requireMembershipApi(admin, "community_view");
  if (!gate.ok) return gate.response;
  const profileRow = gate.profileRow;

  try {
    const lists = await listConnectionsForViewer(admin, profileRow.id);
    const otherIds = [
      ...lists.incoming,
      ...lists.outgoing,
      ...lists.connected,
      ...lists.blocked,
    ].map((row) =>
      String(row.requester_profile_id) === String(profileRow.id)
        ? row.recipient_profile_id
        : row.requester_profile_id,
    );
    const profiles = await loadProfilesByIds(admin, otherIds);

    return Response.json({
      ok: true,
      viewerProfileId: profileRow.id,
      incoming: lists.incoming.map((row) => serializeConnection(row, profileRow.id, profiles)),
      outgoing: lists.outgoing.map((row) => serializeConnection(row, profileRow.id, profiles)),
      connected: lists.connected.map((row) => serializeConnection(row, profileRow.id, profiles)),
      blocked: lists.blocked.map((row) => serializeConnection(row, profileRow.id, profiles)),
    });
  } catch (err) {
    logConnectionFailure("list", err, { viewerProfileId: profileRow.id });
    const message = err instanceof Error ? err.message : "Could not load connections.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request) {
  const __guard = guardMutation(request, { rateKey: "community-connections", limit: 40 });
  if (!__guard.ok) return guardFailureResponse(__guard);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Storage unavailable." }, { status: 503 });
  }

  const gate = await requireMembershipApi(admin, "community_view");
  if (!gate.ok) return gate.response;
  const profileRow = gate.profileRow;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const action = String(body.action || "request").toLowerCase();
  const targetProfileId = String(body.targetProfileId || body.otherProfileId || "").trim();
  const connectionId = String(body.connectionId || "").trim();

  try {
    let result;
    if (action === "request" || action === "send") {
      if (!targetProfileId) {
        return Response.json({ ok: false, message: "Choose a member to connect with." }, { status: 400 });
      }
      result = await sendConnectionRequest(admin, {
        viewerProfileId: profileRow.id,
        targetProfileId,
      });
      if (result.ok && result.state === "request_sent" && result.row) {
        const senderName = displayNameFromProfile(profileRow);
        const notif = await createNotificationDeduped(admin, {
          recipientProfileId: targetProfileId,
          audienceScope: "user",
          type: "connection_request",
          title: "New connection request",
          message: `${senderName} wants to connect with you in the Outreach Project community.`,
          linkPath: "/community?connections=1",
          entityType: "member_connection",
          entityId: String(result.row.id),
          metadata: { requester_profile_id: profileRow.id },
          dedupeHours: 24,
        });
        if (!notif?.ok && !notif?.skipped) {
          console.warn("[community/connections] notification failed:", notif?.reason || "unknown");
        }
      }
      if (result.ok && result.state === "connected" && result.row) {
        const otherId =
          String(result.row.requester_profile_id) === String(profileRow.id)
            ? result.row.recipient_profile_id
            : result.row.requester_profile_id;
        const acceptorName = displayNameFromProfile(profileRow);
        await createNotificationDeduped(admin, {
          recipientProfileId: otherId,
          audienceScope: "user",
          type: "connection_accepted",
          title: "Connection accepted",
          message: `${acceptorName} accepted your connection request.`,
          linkPath: "/community?connections=1",
          entityType: "member_connection",
          entityId: String(result.row.id),
          dedupeHours: 24,
        });
      }
    } else if (action === "accept") {
      result = await acceptConnectionRequest(admin, {
        viewerProfileId: profileRow.id,
        connectionId: connectionId || undefined,
        otherProfileId: targetProfileId || undefined,
      });
      if (result.ok && result.row) {
        const otherId =
          String(result.row.requester_profile_id) === String(profileRow.id)
            ? result.row.recipient_profile_id
            : result.row.requester_profile_id;
        const acceptorName = displayNameFromProfile(profileRow);
        await createNotificationDeduped(admin, {
          recipientProfileId: otherId,
          audienceScope: "user",
          type: "connection_accepted",
          title: "Connection accepted",
          message: `${acceptorName} accepted your connection request.`,
          linkPath: "/community?connections=1",
          entityType: "member_connection",
          entityId: String(result.row.id),
          dedupeHours: 24,
        });
      }
    } else if (
      action === "decline" ||
      action === "cancel" ||
      action === "remove" ||
      action === "block" ||
      action === "unblock"
    ) {
      result = await mutateConnectionStatus(admin, {
        viewerProfileId: profileRow.id,
        connectionId: connectionId || undefined,
        otherProfileId: targetProfileId || undefined,
        as: action,
      });
    } else {
      return Response.json({ ok: false, message: "Invalid action." }, { status: 400 });
    }

    if (!result.ok) {
      return Response.json(result, { status: 400 });
    }

    return Response.json({
      ok: true,
      message: result.message,
      state: result.state,
      uiState: connectionStateForUi(result.state),
      connectionId: result.row?.id || null,
    });
  } catch (err) {
    logConnectionFailure(action, err, {
      viewerProfileId: profileRow.id,
      targetProfileId: targetProfileId || null,
    });
    const message = err instanceof Error ? err.message : "Could not update connection.";
    return Response.json({ ok: false, message }, { status: 500 });
  }
}
