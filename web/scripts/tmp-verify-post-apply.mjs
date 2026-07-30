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
const admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const anon = createClient(
  env("NEXT_PUBLIC_SUPABASE_URL"),
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
  { auth: { persistSession: false } },
);

const { data, error } = await admin.rpc("_top_rls_security_audit");
console.log("audit error:", error && { code: error.code, message: error.message, details: error.details, hint: error.hint });
console.log("audit rows:", Array.isArray(data) ? data.length : data);
if (Array.isArray(data)) {
  const fails = data.filter((r) => r.status === "FAIL");
  const warns = data.filter((r) => r.status === "WARN");
  console.log("FAIL", fails.length, "WARN", warns.length);
  for (const r of fails.slice(0, 40)) console.log(" FAIL", r.object_type, r.object_name, r.detail);
  for (const r of warns.slice(0, 20)) console.log(" WARN", r.object_type, r.object_name, r.detail);
}

// Spot-check former leak tables
for (const table of [
  "top_app_saved_org_eins",
  "curated_orgs",
  "nonprofit_websites_stage",
  "favorites",
  "nonprofits",
  "sponsors_catalog",
  "community_posts",
]) {
  const pub = await anon.from(table).select("*", { count: "exact", head: true });
  const ins = await anon.from(table).insert({}).select();
  const cls = !ins.error
    ? "INSERT_OK"
    : /row-level security|42501/i.test(`${ins.error.code} ${ins.error.message}`)
      ? "RLS_BLOCK"
      : /null value|not-null|check|invalid|duplicate|foreign key/i.test(ins.error.message || "")
        ? "REACHED"
        : `OTHER:${ins.error.code}`;
  console.log(
    table.padEnd(32),
    pub.error ? `anonERR=${pub.error.code}` : `anon=${pub.count ?? 0}`,
    cls,
  );
}
