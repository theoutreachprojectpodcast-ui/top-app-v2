/**
 * Archive connection_request notifications whose entity is no longer pending.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

const { data: notifs, error } = await admin
  .from("top_platform_notifications")
  .select("id,entity_id,status")
  .eq("notification_type", "connection_request")
  .neq("status", "archived")
  .limit(200);
if (error) {
  console.error(error.message);
  process.exit(1);
}

let archived = 0;
const now = new Date().toISOString();
for (const n of notifs || []) {
  const entityId = String(n.entity_id || "").trim();
  if (!entityId) continue;
  const { data: conn } = await admin
    .from("member_connections")
    .select("id,status")
    .eq("id", entityId)
    .maybeSingle();
  const status = String(conn?.status || "").toLowerCase();
  if (conn && status === "pending") continue;
  const { error: upErr } = await admin
    .from("top_platform_notifications")
    .update({ status: "archived", read_at: now, updated_at: now })
    .eq("id", n.id);
  if (!upErr) archived += 1;
}

console.log({ scanned: (notifs || []).length, archived });
