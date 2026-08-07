/**
 * Verify acceptConnectionRequest prefers connectionId for the live pending row.
 * Does NOT leave the row accepted — declines back to pending is not possible;
 * this script only dry-runs find + reports. Use --accept to actually accept.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  acceptConnectionRequest,
  listConnectionsForViewer,
  resetConnectionsBackendCache,
} from "../src/lib/community/memberConnections.js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const doAccept = process.argv.includes("--accept");

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

const pending = await admin
  .from("member_connections")
  .select("*")
  .eq("status", "pending")
  .order("updated_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (pending.error) {
  console.error("load pending failed", pending.error.message);
  process.exit(1);
}
if (!pending.data) {
  console.log("no pending row to verify");
  process.exit(0);
}

const row = pending.data;
const recipient = row.recipient_profile_id;
const inbox = await listConnectionsForViewer(admin, recipient);
console.log({
  connectionId: row.id,
  recipient,
  inboxIncoming: inbox.incoming.map((r) => r.id),
});

if (!doAccept) {
  console.log("dry-run ok (pass --accept to accept this request)");
  process.exit(0);
}

const result = await acceptConnectionRequest(admin, {
  viewerProfileId: recipient,
  connectionId: row.id,
  otherProfileId: row.requester_profile_id,
});
console.log("accept", result);
const after = await listConnectionsForViewer(admin, recipient);
console.log("connected after", after.connected.map((r) => r.id));
