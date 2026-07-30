import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import {
  membershipDeniedResponse,
  profilePassesMembershipScope,
} from "@/lib/membership/membershipRouteGuard";
import {
  acceptConnectionRequest,
  connectionStateForUi,
  listConnectionsForViewer,
  mutateConnectionStatus,
  sendConnectionRequest,
  viewerConnectionState,
} from "@/lib/community/memberConnections";
import { createPlatformNotification } from "@/server/notifications/notificationService";

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

export async function GET() {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!profileRow?.id || !profilePassesMembershipScope(profileRow, "community_view")) {
    return membershipDeniedResponse("community_view");
  }

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
    const message = err instanceof Error ? err.message : "Could not load connections.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request) {
  const __guard = guardMutation(request, { rateKey: "community-connections", limit: 40 });
  if (!__guard.ok) return guardFailureResponse(__guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Storage unavailable." }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!profileRow?.id || !profilePassesMembershipScope(profileRow, "community_view")) {
    return membershipDeniedResponse("community_view");
  }

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
        await createPlatformNotification(admin, {
          recipientProfileId: targetProfileId,
          audienceScope: "user",
          type: "connection_request",
          title: "New connection request",
          message: "Someone in the Outreach Project community wants to connect with you.",
          linkPath: "/community",
          entityType: "member_connection",
          entityId: String(result.row.id),
          metadata: { requester_profile_id: profileRow.id },
        });
      }
      if (result.ok && result.state === "connected" && result.row) {
        const otherId =
          String(result.row.requester_profile_id) === String(profileRow.id)
            ? result.row.recipient_profile_id
            : result.row.requester_profile_id;
        await createPlatformNotification(admin, {
          recipientProfileId: otherId,
          audienceScope: "user",
          type: "connection_accepted",
          title: "Connection accepted",
          message: "You’re now connected in the Outreach Project community.",
          linkPath: "/community",
          entityType: "member_connection",
          entityId: String(result.row.id),
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
        await createPlatformNotification(admin, {
          recipientProfileId: otherId,
          audienceScope: "user",
          type: "connection_accepted",
          title: "Connection accepted",
          message: "You’re now connected in the Outreach Project community.",
          linkPath: "/community",
          entityType: "member_connection",
          entityId: String(result.row.id),
        });
      }
    } else if (action === "decline" || action === "cancel" || action === "remove" || action === "block") {
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
    const message = err instanceof Error ? err.message : "Could not update connection.";
    return Response.json({ ok: false, message }, { status: 500 });
  }
}
