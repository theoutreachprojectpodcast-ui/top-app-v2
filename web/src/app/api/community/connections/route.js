import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";
import {
  acceptConnectionRequest,
  connectionStateForUi,
  listConnectionsForViewer,
  mutateConnectionStatus,
  resolveConnectionTargetProfileId,
  sendConnectionRequest,
  viewerConnectionState,
} from "@/lib/community/memberConnections";
import {
  createNotificationDeduped,
  markConnectionRequestNotificationsActed,
} from "@/server/notifications/notificationService";

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
    acceptedAt: row.accepted_at || null,
    declinedAt: row.declined_at || null,
    cancelledAt: row.cancelled_at || null,
    removedAt: row.removed_at || null,
  };
}

function logConnectionFailure(action, err, meta = {}) {
  console.error("[community/connections]", {
    action,
    message: err instanceof Error ? err.message : String(err || "unknown"),
    ...meta,
  });
}

function connectionRequestLink(requesterProfileId, connectionId) {
  const params = new URLSearchParams({ connections: "1" });
  if (requesterProfileId) params.set("member", String(requesterProfileId));
  if (connectionId) params.set("connectionId", String(connectionId));
  return `/community?${params.toString()}`;
}

async function notifyConnectionRequest(admin, { recipientProfileId, requesterProfile, connectionId }) {
  const senderName = displayNameFromProfile(requesterProfile);
  const avatarUrl = String(requesterProfile?.profile_photo_url || "").trim();
  return createNotificationDeduped(admin, {
    recipientProfileId,
    audienceScope: "user",
    type: "connection_request",
    title: "New connection request",
    message: `${senderName} wants to connect with you in the Outreach Project community.`,
    linkPath: connectionRequestLink(requesterProfile?.id, connectionId),
    entityType: "member_connection",
    entityId: String(connectionId),
    metadata: {
      requester_profile_id: requesterProfile?.id || null,
      requester_name: senderName,
      requester_avatar_url: avatarUrl,
      connection_id: String(connectionId),
      actions: ["accept", "decline"],
    },
    dedupeHours: 24,
  });
}

async function notifyConnectionAccepted(admin, { recipientProfileId, acceptorProfile, connectionId }) {
  const acceptorName = displayNameFromProfile(acceptorProfile);
  return createNotificationDeduped(admin, {
    recipientProfileId,
    audienceScope: "user",
    type: "connection_accepted",
    title: "Connection accepted",
    message: `${acceptorName} accepted your connection request.`,
    linkPath: `/community?connections=1&member=${encodeURIComponent(String(acceptorProfile?.id || ""))}`,
    entityType: "member_connection",
    entityId: String(connectionId),
    metadata: {
      acceptor_profile_id: acceptorProfile?.id || null,
      acceptor_name: acceptorName,
      acceptor_avatar_url: String(acceptorProfile?.profile_photo_url || "").trim(),
      connection_id: String(connectionId),
    },
    dedupeHours: 24,
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
  let targetProfileId = String(body.targetProfileId || body.otherProfileId || "").trim();
  const connectionId = String(body.connectionId || "").trim();

  try {
    if (targetProfileId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetProfileId)) {
      targetProfileId = await resolveConnectionTargetProfileId(admin, targetProfileId);
    }

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
        const notif = await notifyConnectionRequest(admin, {
          recipientProfileId: targetProfileId,
          requesterProfile: profileRow,
          connectionId: result.row.id,
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
        await notifyConnectionAccepted(admin, {
          recipientProfileId: otherId,
          acceptorProfile: profileRow,
          connectionId: result.row.id,
        });
        await markConnectionRequestNotificationsActed(admin, {
          connectionId: result.row.id,
          recipientProfileId: profileRow.id,
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
        await notifyConnectionAccepted(admin, {
          recipientProfileId: otherId,
          acceptorProfile: profileRow,
          connectionId: result.row.id,
        });
        await markConnectionRequestNotificationsActed(admin, {
          connectionId: result.row.id,
          recipientProfileId: profileRow.id,
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
      if (result.ok && (action === "decline" || action === "cancel") && result.row?.id) {
        await markConnectionRequestNotificationsActed(admin, {
          connectionId: result.row.id,
          recipientProfileId: action === "decline" ? profileRow.id : undefined,
        });
      }
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
      otherProfileId:
        result.row &&
        (String(result.row.requester_profile_id) === String(profileRow.id)
          ? result.row.recipient_profile_id
          : result.row.requester_profile_id),
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
