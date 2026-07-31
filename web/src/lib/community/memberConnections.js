/**
 * Server helpers for persistent member friend connections (top_profiles UUIDs).
 *
 * Canonical store: `member_connections`.
 * Legacy fallback: `community_follows` with pending:/blocked: encodings.
 * When the primary table exists, legacy rows are migrated into it once per process.
 */

const PRIMARY_TABLE = "member_connections";
const FALLBACK_TABLE = "community_follows";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function isPrimaryUnavailableError(error) {
  if (isMissingRelationError(error)) return true;
  const msg = String(error?.message || error || "").toLowerCase();
  const code = String(error?.code || "");
  return (
    code === "42501" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("rls")
  );
}

function isUuid(value) {
  return UUID_RE.test(String(value || "").trim());
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
      blocked_by_profile_id: row.blocked_by_profile_id ? String(row.blocked_by_profile_id) : null,
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
      blocked_by_profile_id: follower,
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
      blocked_by_profile_id: null,
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
    blocked_by_profile_id: null,
    _backend: "community_follows",
  };
}

let backendCache = null;
let migratePromise = null;

/** @internal test helper */
export function resetConnectionsBackendCache() {
  backendCache = null;
  migratePromise = null;
}

/**
 * Copy legacy community_follows friend encodings into member_connections (idempotent).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 */
export async function migrateCommunityFollowsToMemberConnections(admin) {
  if (!admin) return { ok: false, migrated: 0, reason: "no_admin" };

  const { error: primaryErr } = await admin.from(PRIMARY_TABLE).select("id").limit(1);
  if (primaryErr) {
    if (isPrimaryUnavailableError(primaryErr)) return { ok: false, migrated: 0, reason: "primary_unavailable" };
    return { ok: false, migrated: 0, reason: primaryErr.message };
  }

  const { data: followRows, error: followErr } = await admin.from(FALLBACK_TABLE).select("*").limit(2000);
  if (followErr) {
    if (isMissingRelationError(followErr)) return { ok: true, migrated: 0, reason: "fallback_missing" };
    return { ok: false, migrated: 0, reason: followErr.message };
  }

  const rows = Array.isArray(followRows) ? followRows : [];
  if (!rows.length) return { ok: true, migrated: 0 };

  const { data: existing } = await admin
    .from(PRIMARY_TABLE)
    .select("requester_profile_id,recipient_profile_id,status")
    .in("status", ["pending", "accepted", "blocked"])
    .limit(2000);

  const activePairs = new Set();
  for (const row of existing || []) {
    activePairs.add(connectionPairKey(row.requester_profile_id, row.recipient_profile_id));
  }

  /** @type {Map<string, { requester: string, recipient: string, status: string, created_at: string, blocked_by?: string }>} */
  const toInsert = new Map();
  /** @type {Map<string, { a: string, b: string, created_at: string }>} */
  const acceptedEdges = new Map();

  for (const raw of rows) {
    const follower = String(raw.follower_id || "").trim();
    const following = String(raw.following_id || "").trim();
    const createdAt = raw.created_at || new Date().toISOString();
    const pendingFor = parsePendingTarget(following);
    const blockedFor = parseBlockedTarget(following);

    if (pendingFor) {
      if (!isUuid(follower) || !isUuid(pendingFor) || follower === pendingFor) continue;
      const key = connectionPairKey(follower, pendingFor);
      if (activePairs.has(key) || toInsert.has(key)) continue;
      toInsert.set(key, {
        requester: follower,
        recipient: pendingFor,
        status: "pending",
        created_at: createdAt,
      });
      continue;
    }

    if (blockedFor) {
      if (!isUuid(follower) || !isUuid(blockedFor) || follower === blockedFor) continue;
      const key = connectionPairKey(follower, blockedFor);
      if (activePairs.has(key) || toInsert.has(key)) continue;
      toInsert.set(key, {
        requester: follower,
        recipient: blockedFor,
        status: "blocked",
        created_at: createdAt,
        blocked_by: follower,
      });
      continue;
    }

    if (isUuid(follower) && isUuid(following) && follower !== following) {
      const edgeKey = connectionPairKey(follower, following);
      const prev = acceptedEdges.get(edgeKey);
      if (!prev) {
        acceptedEdges.set(edgeKey, { a: follower, b: following, created_at: createdAt, count: 1 });
      } else {
        prev.count += 1;
        if (createdAt < prev.created_at) prev.created_at = createdAt;
      }
    }
  }

  for (const [key, edge] of acceptedEdges) {
    // Prefer mutual pairs; also repair one-sided accepted edges into a single canonical row.
    if (!edge.count) continue;
    if (activePairs.has(key) || toInsert.has(key)) continue;
    const left = edge.a < edge.b ? edge.a : edge.b;
    const right = edge.a < edge.b ? edge.b : edge.a;
    toInsert.set(key, {
      requester: left,
      recipient: right,
      status: "accepted",
      created_at: edge.created_at,
    });
  }

  let migrated = 0;
  for (const item of toInsert.values()) {
    const now = item.created_at || new Date().toISOString();
    const payload = {
      requester_profile_id: item.requester,
      recipient_profile_id: item.recipient,
      status: item.status,
      created_at: now,
      updated_at: now,
      responded_at: item.status === "pending" ? null : now,
      blocked_by_profile_id: item.blocked_by || null,
    };
    const { error } = await admin.from(PRIMARY_TABLE).insert(payload);
    if (error) {
      if (String(error.code) === "23505" || /duplicate/i.test(String(error.message || ""))) continue;
      // Missing FK / invalid profile — skip orphan
      if (String(error.code) === "23503") continue;
      console.warn("[memberConnections] migrate insert failed:", error.message || error);
      continue;
    }
    migrated += 1;
    activePairs.add(connectionPairKey(item.requester, item.recipient));
  }

  return { ok: true, migrated, candidates: toInsert.size };
}

async function ensureMigrated(admin) {
  if (migratePromise) return migratePromise;
  migratePromise = migrateCommunityFollowsToMemberConnections(admin).catch((err) => {
    migratePromise = null;
    console.warn("[memberConnections] migrate failed:", err?.message || err);
    return { ok: false, migrated: 0, reason: String(err?.message || err) };
  });
  return migratePromise;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @returns {Promise<'member_connections' | 'community_follows'>}
 */
export async function resolveConnectionsBackend(admin) {
  if (backendCache) return backendCache;
  const { error } = await admin.from(PRIMARY_TABLE).select("id").limit(1);
  if (!error) {
    backendCache = "member_connections";
    await ensureMigrated(admin);
    return backendCache;
  }
  if (isPrimaryUnavailableError(error)) {
    console.warn(
      "[memberConnections] primary unavailable, using community_follows fallback:",
      error.message || error.code,
    );
    backendCache = "community_follows";
    return backendCache;
  }
  // Unexpected error — still try primary and let callers surface it
  backendCache = "member_connections";
  return backendCache;
}

async function findConnectionById(admin, viewerProfileId, connectionId) {
  const id = String(connectionId || "").trim();
  const viewer = String(viewerProfileId || "").trim();
  if (!id || !viewer) return null;

  const backend = await resolveConnectionsBackend(admin);
  if (backend === "member_connections" && isUuid(id)) {
    const { data, error } = await admin.from(PRIMARY_TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const normalized = normalizeConnectionRow(data);
    if (
      String(normalized.requester_profile_id) !== viewer &&
      String(normalized.recipient_profile_id) !== viewer
    ) {
      return null;
    }
    return normalized;
  }

  const lists = await listConnectionsForViewer(admin, viewer);
  return (
    [...lists.incoming, ...lists.outgoing, ...lists.connected, ...lists.blocked].find(
      (r) => String(r.id) === id,
    ) || null
  );
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
  if (!isUuid(viewer) || !isUuid(target)) {
    return { ok: false, message: "Invalid member profile." };
  }

  const existing = await findActiveConnectionBetween(admin, viewer, target);
  if (existing) {
    const state = viewerConnectionState(existing, viewer);
    if (state === "connected") return { ok: false, message: "You’re already connected.", state, row: existing };
    if (state === "blocked") return { ok: false, message: "This connection isn’t available.", state, row: existing };
    if (state === "request_sent") return { ok: true, message: "Request already sent.", state, row: existing };
    if (state === "request_received") {
      return acceptConnectionRequest(admin, {
        viewerProfileId: viewer,
        connectionId: existing.id,
        otherProfileId: target,
      });
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
        const again = await findActiveConnectionBetween(admin, viewer, target);
        return { ok: true, message: "Request already sent.", state: "request_sent", row: again };
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
      const again = await findActiveConnectionBetween(admin, viewer, target);
      if (again) {
        const state = viewerConnectionState(again, viewer);
        if (state === "request_received") {
          return acceptConnectionRequest(admin, {
            viewerProfileId: viewer,
            connectionId: again.id,
            otherProfileId: target,
          });
        }
        return { ok: true, message: "Request already sent.", state: "request_sent", row: again };
      }
      return { ok: false, message: "A connection request already exists.", state: "request_sent" };
    }
    return { ok: false, message: error.message || "Could not send request." };
  }

  return { ok: true, message: "Connection request sent.", state: "request_sent", row: normalizeConnectionRow(data) };
}

export async function acceptConnectionRequest(admin, { viewerProfileId, connectionId, otherProfileId }) {
  const viewer = String(viewerProfileId || "").trim();
  let row = null;

  // Prefer explicit connection id (UI inbox), then pair lookup.
  if (connectionId) {
    row = await findConnectionById(admin, viewer, connectionId);
  }
  if ((!row || String(row.status) !== "pending") && otherProfileId) {
    row = await findActiveConnectionBetween(admin, viewer, otherProfileId);
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
  const query = admin
    .from(PRIMARY_TABLE)
    .update({ status: "accepted", updated_at: now, responded_at: now })
    .eq("status", "pending");

  const { data, error } = isUuid(row.id)
    ? await query.eq("id", row.id).select("*").maybeSingle()
    : await query
        .eq("requester_profile_id", requester)
        .eq("recipient_profile_id", viewer)
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
  const targetOther = String(otherProfileId || "").trim();

  if (connectionId) {
    row = await findConnectionById(admin, viewer, connectionId);
  }
  if (!row && targetOther) {
    row = await findActiveConnectionBetween(admin, viewer, targetOther);
  }

  // Block may create a new relationship when none exists.
  if (!row && action === "block" && targetOther && isUuid(targetOther) && targetOther !== viewer) {
    const backend = await resolveConnectionsBackend(admin);
    const now = new Date().toISOString();
    if (backend === "community_follows") {
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", viewer).eq("following_id", targetOther);
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", targetOther).eq("following_id", viewer);
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", viewer).eq("following_id", pendingTarget(targetOther));
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", targetOther).eq("following_id", pendingTarget(viewer));
      const { data, error } = await admin
        .from(FALLBACK_TABLE)
        .upsert({ follower_id: viewer, following_id: blockedTarget(targetOther) })
        .select("*")
        .maybeSingle();
      if (error) return { ok: false, message: error.message || "Could not block." };
      return { ok: true, message: "User blocked.", state: "blocked", row: normalizeConnectionRow(data) };
    }
    const { data, error } = await admin
      .from(PRIMARY_TABLE)
      .insert({
        requester_profile_id: viewer,
        recipient_profile_id: targetOther,
        status: "blocked",
        blocked_by_profile_id: viewer,
        created_at: now,
        updated_at: now,
        responded_at: now,
      })
      .select("*")
      .maybeSingle();
    if (error) {
      if (String(error.code) === "23505") {
        const existing = await findActiveConnectionBetween(admin, viewer, targetOther);
        if (existing) {
          return mutateConnectionStatus(admin, {
            viewerProfileId: viewer,
            otherProfileId: targetOther,
            as: "block",
          });
        }
      }
      return { ok: false, message: error.message || "Could not block." };
    }
    return { ok: true, message: "User blocked.", state: "blocked", row: normalizeConnectionRow(data) };
  }

  if (!row) return { ok: false, message: "Connection not found." };

  const requester = String(row.requester_profile_id);
  const recipient = String(row.recipient_profile_id);
  if (viewer !== requester && viewer !== recipient) {
    return { ok: false, message: "Not authorized." };
  }

  const backend = await resolveConnectionsBackend(admin);
  const other = viewer === requester ? recipient : requester;

  if (action === "unblock") {
    if (String(row.status) !== "blocked") {
      return { ok: false, message: "No block to remove." };
    }
    const blockedBy = row.blocked_by_profile_id ? String(row.blocked_by_profile_id) : requester;
    if (blockedBy && blockedBy !== viewer) {
      return { ok: false, message: "Only the member who blocked can unblock." };
    }
    if (backend === "community_follows") {
      await admin.from(FALLBACK_TABLE).delete().eq("follower_id", viewer).eq("following_id", blockedTarget(other));
      return { ok: true, message: "User unblocked.", state: "none", row: null };
    }
    const now = new Date().toISOString();
    const { data, error } = await admin
      .from(PRIMARY_TABLE)
      .update({ status: "removed", updated_at: now, responded_at: now, blocked_by_profile_id: null })
      .eq("id", row.id)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, message: error.message || "Could not unblock." };
    return {
      ok: true,
      message: "User unblocked.",
      state: "none",
      row: normalizeConnectionRow(data),
    };
  }

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
  let blockedBy = null;
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
    blockedBy = viewer;
  } else {
    return { ok: false, message: "Invalid action." };
  }

  const update = { status: nextStatus, updated_at: now, responded_at: now };
  if (action === "block") update.blocked_by_profile_id = blockedBy;
  if (action !== "block") update.blocked_by_profile_id = null;

  const { data, error } = await admin
    .from(PRIMARY_TABLE)
    .update(update)
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

/**
 * Admin listing helper — returns raw normalized rows with optional status filter.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 */
export async function adminListConnections(admin, { status = "", q = "", limit = 100 } = {}) {
  const backend = await resolveConnectionsBackend(admin);
  const cap = Math.min(Math.max(Number(limit) || 100, 1), 500);

  if (backend === "community_follows") {
    const { data, error } = await admin.from(FALLBACK_TABLE).select("*").limit(cap);
    if (error) throw error;
    let rows = (data || []).map(normalizeConnectionRow).filter(Boolean);
    if (status) rows = rows.filter((r) => String(r.status) === String(status));
    return rows;
  }

  let query = admin.from(PRIMARY_TABLE).select("*").order("updated_at", { ascending: false }).limit(cap);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data || []).map(normalizeConnectionRow).filter(Boolean);
  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    rows = rows.filter(
      (r) =>
        String(r.id).toLowerCase().includes(needle) ||
        String(r.requester_profile_id).toLowerCase().includes(needle) ||
        String(r.recipient_profile_id).toLowerCase().includes(needle),
    );
  }
  return rows;
}

export { PRIMARY_TABLE as MEMBER_CONNECTIONS_TABLE, FALLBACK_TABLE as COMMUNITY_FOLLOWS_TABLE };
