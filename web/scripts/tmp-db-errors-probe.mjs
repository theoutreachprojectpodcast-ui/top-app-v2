/**
 * Broader post-RLS database health / advisor-class probes via PostgREST.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function load(rel) {
  for (const l of fs.readFileSync(rel, "utf8").split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    v = v.replace(/\\r\\n/g, "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/[\r\n]+/g, "").trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
function env(n) {
  return String(process.env[n] || "")
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/[\r\n]+/g, "")
    .trim();
}
load("web/.env.vercel.production");
const url = env("NEXT_PUBLIC_SUPABASE_URL");
const service = env("SUPABASE_SERVICE_ROLE_KEY");
const anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
const admin = createClient(url, service, { auth: { persistSession: false } });
const pub = createClient(url, anon, { auth: { persistSession: false } });

const { data: audit, error: auditErr } = await admin.rpc("_top_rls_security_audit");
console.log("audit", auditErr?.message || `rows=${audit?.length} FAIL=${audit?.filter((r) => r.status === "FAIL").length}`);

// Service-role reads that the app needs
const criticalReads = [
  ["top_profiles", "id"],
  ["sponsors_catalog", "slug"],
  ["trusted_resources", "slug"],
  ["community_posts", "id"],
  ["nonprofits", "ein"],
  ["top_app_saved_org_eins", "user_id"],
  ["admin_settings", "setting_key"],
  ["podcast_episodes", "id"],
  ["page_content_blocks", "id"],
];

console.log("\n=== Service-role critical reads ===");
for (const [table, col] of criticalReads) {
  const { count, error } = await admin.from(table).select(col, { count: "exact", head: true });
  console.log(table.padEnd(32), error ? `ERR ${error.code} ${error.message.slice(0, 80)}` : `ok count=${count}`);
}

// Views / MVs still readable by anon?
console.log("\n=== Anon view/MV exposure ===");
const openApi = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: service, Authorization: `Bearer ${service}`, Accept: "application/openapi+json" },
}).then((r) => r.json());
const paths = Object.keys(openApi.paths || {})
  .filter((p) => p.startsWith("/") && !p.includes("{"))
  .map((p) => p.slice(1))
  .filter((t) => !t.startsWith("rpc/"));

const anonReadable = [];
for (const table of paths) {
  const { count, error } = await pub.from(table).select("*", { count: "exact", head: true });
  if (!error && (count || 0) > 0) anonReadable.push({ table, count });
}
console.log("anon readable with rows:", anonReadable.length);
for (const r of anonReadable.slice(0, 40)) console.log(" ", r.table, r.count);

// Try known linter status RPC
for (const fn of ["_top_linter_security_status", "get_advisors"]) {
  const { data, error } = await admin.rpc(fn);
  console.log(`rpc ${fn}:`, error ? `${error.code} ${error.message.slice(0, 100)}` : `ok ${Array.isArray(data) ? data.length : typeof data}`);
}
