import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  listConnectionsForViewer,
  resetConnectionsBackendCache,
} from "../src/lib/community/memberConnections.js";
import { canViewCommunity } from "../src/lib/membership/membershipAccess.js";

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

const { data: rows } = await admin
  .from("member_connections")
  .select("*")
  .in("status", ["pending", "accepted", "blocked"])
  .order("updated_at", { ascending: false });

console.log("active rows:", (rows || []).length);
for (const row of rows || []) {
  const ids = [row.requester_profile_id, row.recipient_profile_id];
  const { data: people } = await admin
    .from("top_profiles")
    .select(
      "id,email,display_name,first_name,last_name,membership_tier,membership_status,billing_status,platform_role,user_status,workos_user_id",
    )
    .in("id", ids);
  const byId = Object.fromEntries((people || []).map((p) => [p.id, p]));
  const req = byId[row.requester_profile_id];
  const rec = byId[row.recipient_profile_id];
  console.log("---");
  console.log("connection", row.id, row.status, row.created_at);
  console.log("requester", {
    id: row.requester_profile_id,
    email: req?.email,
    name: [req?.first_name, req?.last_name].filter(Boolean).join(" ") || req?.display_name,
    tier: req?.membership_tier,
    status: req?.membership_status,
    billing: req?.billing_status,
    canViewCommunity: canViewCommunity(req || {}),
    hasWorkos: !!req?.workos_user_id,
  });
  console.log("recipient", {
    id: row.recipient_profile_id,
    email: rec?.email,
    name: [rec?.first_name, rec?.last_name].filter(Boolean).join(" ") || rec?.display_name,
    tier: rec?.membership_tier,
    status: rec?.membership_status,
    billing: rec?.billing_status,
    canViewCommunity: canViewCommunity(rec || {}),
    hasWorkos: !!rec?.workos_user_id,
  });
  if (rec?.id) {
    const list = await listConnectionsForViewer(admin, rec.id);
    console.log("recipient inbox", {
      incoming: list.incoming.length,
      outgoing: list.outgoing.length,
      connected: list.connected.length,
      incomingIds: list.incoming.map((r) => r.id),
    });
  }
  if (req?.id) {
    const list = await listConnectionsForViewer(admin, req.id);
    console.log("requester lists", {
      outgoing: list.outgoing.length,
      connected: list.connected.length,
    });
  }
}

// Check notifications for connection types
const { data: notifs, error: nErr } = await admin
  .from("top_platform_notifications")
  .select("id,recipient_profile_id,notification_type,title,status,created_at,entity_id")
  .in("notification_type", ["connection_request", "connection_accepted"])
  .order("created_at", { ascending: false })
  .limit(20);
console.log("notif error", nErr?.message || null);
console.log(
  "connection notifications",
  (notifs || []).map((n) => ({
    type: n.notification_type,
    recipient: n.recipient_profile_id,
    status: n.status,
    created: n.created_at,
    entity: n.entity_id,
  })),
);
