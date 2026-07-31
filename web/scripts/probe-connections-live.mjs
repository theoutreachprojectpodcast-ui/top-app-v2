/**
 * Live probe of member_connections rows + insert/list helpers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  listConnectionsForViewer,
  resetConnectionsBackendCache,
  sendConnectionRequest,
  acceptConnectionRequest,
  mutateConnectionStatus,
} from "../src/lib/community/memberConnections.js";

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

const url = clean("NEXT_PUBLIC_SUPABASE_URL");
const service = clean("SUPABASE_SERVICE_ROLE_KEY");
console.log("url?", !!url, "service len", service.length);
const admin = createClient(url, service, {
  auth: { persistSession: false },
});

resetConnectionsBackendCache();

const all = await admin
  .from("member_connections")
  .select("id,requester_profile_id,recipient_profile_id,status,created_at,updated_at")
  .order("updated_at", { ascending: false })
  .limit(50);
console.log("rows error:", all.error?.message || null);
console.log("row count:", (all.data || []).length);
const byStatus = {};
for (const r of all.data || []) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
console.log("byStatus:", byStatus);
console.log(
  "sample:",
  (all.data || []).slice(0, 5).map((r) => ({
    id: r.id,
    status: r.status,
    requester: r.requester_profile_id,
    recipient: r.recipient_profile_id,
  })),
);

const profiles = await admin
  .from("top_profiles")
  .select("id,email,first_name,last_name,membership_tier,membership_status,workos_user_id")
  .not("workos_user_id", "is", null)
  .limit(10);
console.log(
  "profiles sample:",
  (profiles.data || []).map((p) => ({
    id: p.id,
    email: p.email,
    tier: p.membership_tier,
    status: p.membership_status,
  })),
);

const active = (profiles.data || []).filter(
  (p) => String(p.membership_status || "").toLowerCase() === "active" || String(p.membership_tier || "") === "member",
);
console.log("active-ish count in sample:", active.length);

if ((profiles.data || []).length >= 2) {
  const a = profiles.data[0].id;
  const b = profiles.data[1].id;
  console.log("test pair", a, b);
  const listA = await listConnectionsForViewer(admin, a);
  const listB = await listConnectionsForViewer(admin, b);
  console.log("listA", {
    in: listA.incoming.length,
    out: listA.outgoing.length,
    conn: listA.connected.length,
  });
  console.log("listB", {
    in: listB.incoming.length,
    out: listB.outgoing.length,
    conn: listB.connected.length,
  });

  // dry: try send if no active between them
  const sent = await sendConnectionRequest(admin, { viewerProfileId: a, targetProfileId: b });
  console.log("send result:", sent);
  if (sent.ok && sent.state === "request_sent") {
    const listB2 = await listConnectionsForViewer(admin, b);
    console.log("listB after send incoming:", listB2.incoming.length, listB2.incoming[0]?.id);
    // cleanup: cancel
    const cancelled = await mutateConnectionStatus(admin, {
      viewerProfileId: a,
      otherProfileId: b,
      as: "cancel",
    });
    console.log("cleanup cancel:", cancelled);
  }
}
