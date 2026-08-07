/**
 * Live end-to-end: send → notify → accept → mutual friends → remove.
 * Uses service role against production/QA DB (no HTTP session).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  acceptConnectionRequest,
  listConnectionsForViewer,
  mutateConnectionStatus,
  resetConnectionsBackendCache,
  sendConnectionRequest,
} from "../src/lib/community/memberConnections.js";
import { createNotificationDeduped } from "../src/server/notifications/notificationService.js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function load(rel) {
  const p = path.join(webRoot, rel);
  if (!fs.existsSync(p)) return;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    v = v.replace(/[\r\n]+/g, "").trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
function clean(n) {
  return String(process.env[n] || "")
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/[\r\n]+/g, "")
    .trim();
}
for (const f of [".env.local", ".env.production.local", ".env.vercel.production"]) load(f);

const admin = createClient(clean("NEXT_PUBLIC_SUPABASE_URL"), clean("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
resetConnectionsBackendCache();

const keep = process.argv.includes("--keep");

const { data: profiles, error } = await admin
  .from("top_profiles")
  .select("id,email,first_name,last_name,membership_tier,membership_status,workos_user_id")
  .not("workos_user_id", "is", null)
  .eq("membership_status", "active")
  .limit(20);
if (error) {
  console.error("profiles error", error.message);
  process.exit(1);
}

const pool = (profiles || []).filter((p) => p.id);
if (pool.length < 2) {
  console.error("need 2 active profiles");
  process.exit(1);
}

// Prefer two distinct emails to avoid self-duplicate profile pairs.
const byEmail = new Map();
for (const p of pool) {
  const email = String(p.email || "").toLowerCase();
  if (!email) continue;
  if (!byEmail.has(email)) byEmail.set(email, p);
}
const distinct = [...byEmail.values()];
const a = distinct[0] || pool[0];
const b = distinct.find((p) => p.id !== a.id) || pool.find((p) => p.id !== a.id);
console.log("pair", { a: { id: a.id, email: a.email }, b: { id: b.id, email: b.email } });

// Clear any active relationship first.
const existing = await listConnectionsForViewer(admin, a.id);
for (const row of [...existing.incoming, ...existing.outgoing, ...existing.connected, ...existing.blocked]) {
  const other =
    String(row.requester_profile_id) === String(a.id) ? row.recipient_profile_id : row.requester_profile_id;
  if (String(other) !== String(b.id)) continue;
  if (row.status === "pending" && String(row.requester_profile_id) === String(a.id)) {
    await mutateConnectionStatus(admin, { viewerProfileId: a.id, connectionId: row.id, as: "cancel" });
  } else if (row.status === "pending" && String(row.recipient_profile_id) === String(a.id)) {
    await mutateConnectionStatus(admin, { viewerProfileId: a.id, connectionId: row.id, as: "decline" });
  } else if (row.status === "accepted") {
    await mutateConnectionStatus(admin, { viewerProfileId: a.id, connectionId: row.id, as: "remove" });
  } else if (row.status === "blocked") {
    await mutateConnectionStatus(admin, { viewerProfileId: a.id, connectionId: row.id, as: "unblock" });
  }
}

const sent = await sendConnectionRequest(admin, { viewerProfileId: a.id, targetProfileId: b.id });
console.log("send", { ok: sent.ok, state: sent.state, id: sent.row?.id, message: sent.message });
if (!sent.ok || sent.state !== "request_sent") process.exit(1);

const notif = await createNotificationDeduped(admin, {
  recipientProfileId: b.id,
  audienceScope: "user",
  type: "connection_request",
  title: "New connection request",
  message: `${a.first_name || "Member"} wants to connect with you in the Outreach Project community.`,
  linkPath: `/community?connections=1&member=${a.id}&connectionId=${sent.row.id}`,
  entityType: "member_connection",
  entityId: String(sent.row.id),
  metadata: {
    requester_profile_id: a.id,
    requester_name: [a.first_name, a.last_name].filter(Boolean).join(" ") || "Member",
    requester_avatar_url: "",
    connection_id: String(sent.row.id),
    actions: ["accept", "decline"],
  },
  dedupeHours: 24,
});
console.log("notif", notif);

const inbox = await listConnectionsForViewer(admin, b.id);
console.log("recipient incoming", inbox.incoming.map((r) => r.id));
if (!inbox.incoming.some((r) => String(r.id) === String(sent.row.id))) {
  console.error("incoming missing after send");
  process.exit(1);
}

const accepted = await acceptConnectionRequest(admin, {
  viewerProfileId: b.id,
  connectionId: sent.row.id,
  otherProfileId: a.id,
});
console.log("accept", { ok: accepted.ok, state: accepted.state, message: accepted.message });
if (!accepted.ok || accepted.state !== "connected") process.exit(1);

const friendsA = await listConnectionsForViewer(admin, a.id);
const friendsB = await listConnectionsForViewer(admin, b.id);
const aHasB = friendsA.connected.some(
  (r) => r.requester_profile_id === b.id || r.recipient_profile_id === b.id,
);
const bHasA = friendsB.connected.some(
  (r) => r.requester_profile_id === a.id || r.recipient_profile_id === a.id,
);
console.log("mutual friends", { aHasB, bHasA, aCount: friendsA.connected.length, bCount: friendsB.connected.length });
if (!aHasB || !bHasA) process.exit(1);

if (!keep) {
  const removed = await mutateConnectionStatus(admin, {
    viewerProfileId: a.id,
    otherProfileId: b.id,
    as: "remove",
  });
  console.log("cleanup remove", removed.ok, removed.message);
}

console.log("e2e-ok");
