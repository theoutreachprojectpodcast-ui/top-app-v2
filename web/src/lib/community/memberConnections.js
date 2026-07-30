/**
 * Server helpers for persistent member friend connections (top_profiles UUIDs).
 *
 * Prefers `member_connections` when present.
 * Falls back to `community_follows` (already in production) with:
 *   - accepted: follower_id / following_id = profile UUIDs (undirected)
 *   - pending:  following_id = `pending:<recipientProfileId>`
 *   - blocked:  following_id = `blocked:<otherProfileId>`
 */

const PRIMARY_TABLE = "member_connections";
const FALLBACK_TABLE = "community_follows";

function isMissingRelationError(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  const code = String(error?.code || "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  );
}

function pendingTarget(profileId) {
  return `pending:${String(profileId || "").trim()}`;
}

function blockedTarget(profileId) {
  return `blocked:${String(profileId || "").trim()}`;
}

function parsePendingTarget(followingId) {
  const s = String(followingId || "");
  return s.startsWith("pending:") ? s.slice("pending:".length) : "";
}

function parseBlockedTarget(followingId) {
  const s = String(followingId || "");
  return s.startsWith("blocked:") ? s.slice("blocked:".length) : "";
}

/**
 * @param {string} a
 * @param {string} b
 */
export function connectionPairKey(a, b) {
  const x = String(a || "").trim();
  const y = String(b || "").trim();
  return x < y ? `${x}:${y}` : `${y}:${x}`;
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {string} viewerProfileId
 * @returns {'none' | 'request_sent' | 'request_received' | 'connected' | 'blocked' | 'removed'}
 */
export function viewerConnectionState(row, viewerProfileId) {
  if (!row) return "none";
  const viewer = String(viewerProfileId || "").trim();

  // Fallback community_follows shape
  if (row.follower_id != null || row.following_id != null) {
    const follower = String(row.follower_id || "");
    const following = String(row.following_id || "");
    const pendingFor = parsePendingTarget(following);
    const blockedFor = parseBlockedTarget(following);
    if (blockedFor) {
      return follower === viewer || blockedFor === viewer ? "blocked" : "none";
    }
    if (pendingFor) {
      if (follower === viewer) return "request_sent";
      if (pendingFor === viewer) return "request_received";
      return "none";
    }
    if (follower === viewer || following === viewer) return "connected";
    return "none";
  }

  const status = String(row.status || "").toLowerCase();
  const requester = String(row.requester_profile_id || "");
  const recipient = String(row.recipient_profile_id || "");

  if (status === "accepted") return "connected";
  if (status === "blocked") return "blocked";
  if (status === "removed" || status === "declined" || status === "cancelled") return "none";
  if (status === "pending") {
    if (requester === viewer) return "request_sent";
    if (recipient === viewer) return "request_received";
  }
  return "none";
}

export function connectionStateForUi(state) {
  const s = String(state || "none");
  if (s === "request_sent") return "requested";
  if (s === "request_received") return "incoming";
  if (s === "connected") return "connected";
  if (s === "blocked") return "blocked";
  return "connect";
}

/** Normalize either backend row into a common connection object for API serialization. */
export function normalizeConnectionRow(row) {
  if (!row) return null;
  if (row.requester_profile_id != null) {
    return {
      id: row.id || `${row.requester_profile_id}:${row.recipient_profile_id}:${row.status}`,
      requester_profile_id: String(row.requester_profile_id),
      recipient_profile_id: String(row.recipient_profile_id),
      status: String(row.status || "pending"),
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
      responded_at: row.responded_at || null,
      _backend: "member_connections",
    };
  }

  const follower = String(row.follower_id || "");
  const following = String(row.following_id || "");
  const pendingFor = parsePendingTarget(following);
  const blockedFor = parseBlockedTarget(following);

  if (blockedFor) {
    return {
      id: `block:${follower}:${blockedFor}`,
      requester_profile_id: follower,
      recipient_profile_id: blockedFor,
      status: "blocked",
      created_at: row.created_at,
      updated_at: row.created_at,
      responded_at: row.created_at,
      _backend: "community_follows",
    };
  }

  if (pendingFor) {
    return {
      id: `pending:${follower}:${pendingFor}`,
      requester_profile_id: follower,
      recipient_profile_id: pendingFor,
      status: "pending",
      created_at: row.created_at,
      updated_at: row.created_at,
      responded_at: null,
      _backend: "community_follows",
    };
  }

  return {
    id: `accepted:${follower}:${following}`,
    requester_profile_id: follower,
    recipient_profile_id: following,
    status: "accepted",
    created_at: row.created_at,
    updated_at: row.created_at,
    responded_at: row.created_at,
    _backend: "community_follows",
  };
}

let backendCache = null;

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @returns {Promise<'member_connections' | 'community_follows'>}
 */
export async function resolveConnectionsBackend(admin) {
  if (backendCache) return backendCache;
  const { error } = await admin.from(PRIMARY_TABLE).select("id").limit(1);
  if (!error) {
    backendCache = "member_connections";
    return backendCache;
  }
  if (isMissingRelationError(error)) {
    backendCache = "community_follows";
    return backendCache;
  }
  // Unexpected error — still try primary and let callers surface it
  backendCache = "member_connections";
  return backendCache;
}

export async function findActiveConnectionBetween(admin, profileA, profileB) {
  const a = String(profileA || "").trim();
  const b = String(profileB || "").trim();
  if (!a || !b || a === b) return null;

  const backend = await resolveConnectionsBackend(admin);
  if (backend === "community_follows") {
    const { data, error } = await admin
      .from(FALLBACK_TABLE)
      .select("*")
      .or(
        [
          `and(follower_id.eq.${a},following_id.eq.${b})`,
          `and(follower_id.eq.${b},following_id.eq.${a})`,
          `and(follower_id.eq.${a},following_id.eq.${pendingTarget(b)})`,
          `and(follower_id.eq.${b},following_id.eq.${pendingTarget(a)})`,
          `and(follower_id.eq.${a},following_id.eq.${blockedTarget(b)})`,
          `and(follower_id.eq.${b},following_id.eq.${blockedTarget(a)})`,
        ].join(","),
      )
      .limit(10);
    if (error) throw error;
    const rows = (data || []).map(normalizeConnectionRow).filter(Boolean);
    const blocked = rows.find((r) => r.status === "blocked");
    if (blocked) return blocked;
    const pending = rows.find((r) => r.status === "pending");
    if (pending) return pending;
    const accepted = rows.find((r) => r.status === "accepted");
    return accepted || null;
  }

  const { data, error } = await admin
    .from(PRIMARY_TABLE)
    .select("*")
    .or(
      `and(requester_profile_id.eq.${a},recipient_profile_id.eq.${b}),and(requester_profile_id.eq.${b},recipient_profile_id.eq.${a})`,
    )
    .in("status", ["pending", "accepted", "blocked"])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data[0] ? normalizeConnectionRow(data[0]) : null;
}

export async function listConnectionsForViewer(admin, viewerProfileId) {
  const viewer = String(viewerProfileId || "").trim();
  if (!viewer) {
    return { incoming: [], outgoing: [], connected: [], blocked: [] };
  }

  const backend = await resolveConnectionsBackend(admin);
  let rows = [];

  if (backend === "community_follows") {
    const { data, error } = await admin
      .from(FALLBACK_TABLE)
      .select("*")
      .or(`follower_id.eq.${viewer},following_id.eq.${viewer},following_id.eq.${pendingTarget(viewer)}`)
      .limit(500);
    if (error) throw error;
    rows = (data || [])
      .map(normalizeConnectionRow)
      .filter(Boolean)
      // Only rows involving the viewer in a meaningful way
      .filter((row) => {
        const state = viewerConnectionState(row, viewer);
        return state !== "none";
      });
  } else {
    const { data, error } = await admin
      .from(PRIMARY_TABLE)
      .select("*")
      .or(`requester_profile_id.eq.${viewer},recipient_profile_id.eq.${viewer}`)
      .in("status", ["pending", "accepted", "blocked"])
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    rows = (data || []).map(normalizeConnectionRow).filter(Boolean);
  }

  const incoming = [];
  const outgoing = [];
  const connected = [];
  const blocked = [];
  const seenConnected = new Set();
  const seenBlocked = new Set();

  for (const row of rows) {
    const state = viewerConnectionState(row, viewer);
    const other =
      String(row.requester_profile_id) === viewer
        ? String(row.recipient_profile_id)
        : String(row.requester_profile_id);
    if (state === "request_received") incoming.push(row);
    else if (state === "request_sent") outgoing.push(row);
    else if (state === "connected") {
      if (seenConnected.has(other)) continue;
      seenConnected.add(other);
      connected.push(row);
    } else if (state === "blocked") {
      if (seenBlocked.has(other)) continue;
      seenBlocked.add(other);
      blocked.push(row);
    }
  }

  return { incoming, outgoing, connected, blocked };
}

export async function loadAcceptedFriendProfileIds(admin, viewerProfileId) {
  const viewer = String(viewerProfileId || "").trim();
  const ids = new Set();
  if (!viewer) return ids;

  const lists = await listConnectionsForViewer(admin, viewer);
  for (const row of lists.connected) {
    const other =
      String(row.requester_profile_id) === viewer ? row.recipient_profile_id : row.requester_profile_id;
    if (other) ids.add(String(other));
  }
  return ids;
}

export async function sendConnectionRequest(admin, { viewerProfileId, targetProfileId }) {
  const viewer = String(viewerProfileId || "").trim();
  const target = String(targetProfileId || "").trim();
  if (!viewer || !target) return { ok: false, message: "Missing profile." };
  if (viewer === target) return { ok: false, message: "You can’t connect with yourself." };

  const existing = await findActiveConnectionBetween(admin, viewer, target);
  if (existing) {
    const state = viewerConnectionState(existing, viewer);
    if (state === "connected") return { ok: false, message: "You’re already connected.", state, row: existing };
    if (state === "blocked") return { ok: false, message: "This connection isn’t available.", state, row: existing };
    if (state === "request_sent") return { ok: true, message: "Request already sent.", state, row: existing };
    if (state === "request_received") {
      return acceptConnectionRequest(admin, { viewerProfileId: viewer, connectionId: existing.id, otherProfileId: target });
    }
  }

  const backend = await resolveConnectionsBackend(admin);
  if (backend === "community_follows") {
    const { data, error } = await admin
      .from(FALLBACK_TABLE)
      .insert({ follower_id: viewer, following_id: pendingTarget(target) })
      .select("*")
      .maybeSingle();
    if (error) {
      if (String(error.code) === "23505" || /duplicate/i.test(String(error.message || ""))) {
        return { ok: true, message: "Request already sent.", state: "request_sent" };
      }
      return { ok: false, message: error.message || "Could not send request." };
    }
    return {
      ok: true,
      message: "Connection request sent.",
      state: "request_sent",
      row: normalizeConnectionRow(data),
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from(PRIMARY_TABLE)
    .insert({
      requester_profile_id: viewer,
      recipient_profile_id: target,
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (String(error.message || "").toLowerCase().includes("duplicate") || error.code === "23505") {
      return { ok: false, message: "A connection request already exists.", state: "request_sent" };
    }
    return { ok: false, message: error.message || "Could not send request." };
  }

  return { ok: true, message: "Connection request sent.", state: "request_sent", row: normalizeConnectionRow(data) };
}

export async function acceptConnectionRequest(admin, { viewerProfileId, connectionId, otherProfileId }) {
  const viewer = String(viewerProfileId || "").trim();
  let row = null;

  if (otherProfileId) {
    row = await findActiveConnectionBetween(admin, viewer, otherProfileId);
  } else if (connectionId) {
    const lists = await listConnectionsForViewer(admin, viewer);
    row = [...lists.incoming, ...lists.outgoing, ...lists.connected].find((r) => String(r.id) === String(connectionId)) || null;
  }

  if (!row || String(row.status) !== "pending") {
    return { ok: false, message: "No pending request to accept." };
  }
  if (String(row.recipient_profile_id) !== viewer) {
    return { ok: false, message: "Only the recipient can accept this request." };
  }

  const requester = String(row.requester_profile_id);
  const backend = await resolveConnectionsBackend(admin);

  if (backend === "community_follows") {
    await admin.from(FALLBACK_TABLE).delete().eq("follower_id", requester).eq("following_id", pendingTarget(viewer));
    const { error: e1 } = await admin.from(FALLBACK_TABLE).upsert({ follower_id: requester, following_id: viewer });
    if (e1) return { ok: false, message: e1.message || "Could not accept." };
    const { error: e2 } = await admin.from(FALLBACK_TABLE).upsert({ follower_id: viewer, following_id: requester });
    if (e2) return { ok: false, message: e2.message || "Could not accept." };
    const accepted = await findActiveConnectionBetween(admin, viewer, requester);
    return { ok: true, message: "You’re now connected.", state: "connected", row: accepted };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from(PRIMARY_TABLE)
    .update({ status: "accepted", updated_at: now, responded_at: now })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, message: error.message || "Could not accept." };
  if (!data) return { ok: false, message: "Request was already handled." };

  return { ok: true, message: "You’re now connected.", state: "connected", row: normalizeConnectionRow(data) };
}

export async function mutateConnectionStatus(admin, { viewerProfileId, connectionId, otherProfileId, as }) {
  const viewer = String(viewerProfileId || "").trim();
  const action = String(as || "").toLowerCase();
  let row = null;

  if (otherProfileId) {
    row = await findActiveConnectionBetween(admin, viewer, otherProfileId);
  } else if (connectionId) {
    const lists = await listConnectionsForViewer(admin, viewer);
    row =
      [...lists.incoming, ...lists.outgoing, ...lists.connected, ...lists.blocked].find(
        (r) => String(r.id) === String(connectionId),
      ) || null;
  }

  if (!row) return { ok: false, message: "Connection not found." };

  const requester = String(row.requester_profile_id);
  const recipient = String(row.recipient_profile_id);
  if (viewer !== requester && viewer !== recipient) {
    return { ok: false, message: "Not authorized." };
  }

  const backend = await resolveConnectionsBackend(admin);
  const other = viewer === requester ? recipient : requester;

  if (backend === "community_follows") {
    if (action === "decline") {
      if (String(row.status) !== "pending" || viewer !== recipient) {
        return { ok: false, message: "Only the recipient can decline a pending request." };
      }
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", requester).eq("following_id", pendingTarget(viewer));
      return { ok: true, message: "Request declined.", state: "none", row: null };
    }
    if (action === "cancel") {
      if (String(row.status) !== "pending" || viewer !== requester) {
        return { ok: false, message: "Only the sender can cancel a pending request." };
      }
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", viewer).eq("following_id", pendingTarget(recipient));
      return { ok: true, message: "Request cancelled.", state: "none", row: null };
    }
    if (action === "remove") {
      if (String(row.status) !== "accepted") {
        return { ok: false, message: "No accepted connection to remove." };
      }
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", viewer).eq("following_id", other);
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", other).eq("following_id", viewer);
      return { ok: true, message: "Connection removed.", state: "none", row: null };
    }
    if (action === "block") {
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", viewer).eq("following_id", other);
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", other).eq("following_id", viewer);
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", viewer).eq("following_id", pendingTarget(other));
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", other).eq("following_id", pendingTarget(viewer));
      const { data, error } = await admin
        .from(FALLBACK_TABLE)
        .upsert({ follower_id: viewer, following_id: blockedTarget(other) })
        .select("*")
        .maybeSingle();
      if (error) return { ok: false, message: error.message || "Could not block." };
      return { ok: true, message: "User blocked.", state: "blocked", row: normalizeConnectionRow(data) };
    }
    return { ok: false, message: "Invalid action." };
  }

  const now = new Date().toISOString();
  let nextStatus = null;
  if (action === "decline") {
    if (String(row.status) !== "pending" || viewer !== recipient) {
      return { ok: false, message: "Only the recipient can decline a pending request." };
    }
    nextStatus = "declined";
  } else if (action === "cancel") {
    if (String(row.status) !== "pending" || viewer !== requester) {
      return { ok: false, message: "Only the sender can cancel a pending request." };
    }
    nextStatus = "cancelled";
  } else if (action === "remove") {
    if (String(row.status) !== "accepted") {
      return { ok: false, message: "No accepted connection to remove." };
    }
    nextStatus = "removed";
  } else if (action === "block") {
    nextStatus = "blocked";
  } else {
    return { ok: false, message: "Invalid action." };
  }

  const { data, error } = await admin
    .from(PRIMARY_TABLE)
    .update({ status: nextStatus, updated_at: now, responded_at: now })
    .eq("id", row.id)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, message: error.message || "Could not update connection." };

  return {
    ok: true,
    message:
      action === "decline"
        ? "Request declined."
        : action === "cancel"
          ? "Request cancelled."
          : action === "remove"
            ? "Connection removed."
            : "User blocked.",
    state: viewerConnectionState(normalizeConnectionRow(data), viewer),
    row: normalizeConnectionRow(data),
  };
}

export { PRIMARY_TABLE as MEMBER_CONNECTIONS_TABLE, FALLBACK_TABLE as COMMUNITY_FOLLOWS_TABLE };
