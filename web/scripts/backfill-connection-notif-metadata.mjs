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
  .select("id,entity_id,recipient_profile_id,metadata,status")
  .eq("notification_type", "connection_request")
  .eq("status", "unread")
  .limit(100);
if (error) {
  console.error(error.message);
  process.exit(1);
}

let updated = 0;
for (const n of notifs || []) {
  const meta = n.metadata && typeof n.metadata === "object" ? n.metadata : {};
  if (meta.requester_profile_id && meta.actions) continue;
  const { data: conn } = await admin.from("member_connections").select("*").eq("id", n.entity_id).maybeSingle();
  if (!conn) continue;
  const { data: req } = await admin
    .from("top_profiles")
    .select("id,first_name,last_name,display_name,profile_photo_url")
    .eq("id", conn.requester_profile_id)
    .maybeSingle();
  const name =
    [req?.first_name, req?.last_name].filter(Boolean).join(" ").trim() || req?.display_name || "Member";
  const next = {
    ...meta,
    requester_profile_id: conn.requester_profile_id,
    requester_name: name,
    requester_avatar_url: req?.profile_photo_url || "",
    connection_id: conn.id,
    actions: ["accept", "decline"],
  };
  const linkPath = `/community?connections=1&member=${conn.requester_profile_id}&connectionId=${conn.id}`;
  const { error: upErr } = await admin
    .from("top_platform_notifications")
    .update({ metadata: next, link_path: linkPath, updated_at: new Date().toISOString() })
    .eq("id", n.id);
  if (!upErr) updated += 1;
}

console.log({ found: (notifs || []).length, updated });
