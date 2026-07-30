/**
 * Live production RLS / exposure audit (no secrets printed).
 * Loads web/.env.vercel.production then probes OpenAPI + audit RPCs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(rel) {
  const envPath = path.join(webRoot, rel);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    val = val.replace(/\r/g, "").trim();
    if (!process.env[key]) process.env[key] = val;
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

loadEnvFile(".env.vercel.production");
loadEnvFile(".env.local");

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
const ref = (url.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1] || "";

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

console.log("project_ref:", ref);
console.log("url_host:", new URL(url).host);

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

console.log("\n=== Audit RPCs ===");
for (const fn of [
  "_top_rls_security_audit",
  "_torp_rls_security_audit",
  "_top_linter_security_status",
]) {
  const { data, error } = await admin.rpc(fn);
  if (error) {
    console.log(`${fn}: MISSING/ERR ${error.code || ""} ${String(error.message || "").slice(0, 120)}`);
    continue;
  }
  const rows = Array.isArray(data) ? data : [];
  const fails = rows.filter((r) => String(r.status || "").toUpperCase() === "FAIL");
  const warns = rows.filter((r) => String(r.status || "").toUpperCase() === "WARN");
  const oks = rows.filter((r) => String(r.status || "").toUpperCase() === "OK");
  console.log(`${fn}: rows=${rows.length} OK=${oks.length} WARN=${warns.length} FAIL=${fails.length}`);
  for (const row of fails.slice(0, 80)) {
    console.log(
      `  FAIL ${row.object_type || "?"} ${row.object_name || row.table_name || "?"}: ${row.detail || row.message || JSON.stringify(row).slice(0, 200)}`,
    );
  }
  for (const row of warns.slice(0, 40)) {
    console.log(
      `  WARN ${row.object_type || "?"} ${row.object_name || row.table_name || "?"}: ${row.detail || row.message || JSON.stringify(row).slice(0, 200)}`,
    );
  }
}

console.log("\n=== OpenAPI table discovery + RLS insert probe ===");
const openApiRes = await fetch(`${url}/rest/v1/`, {
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/openapi+json",
  },
});
const spec = await openApiRes.json();
const tables = Object.keys(spec.paths || {})
  .filter((p) => p.startsWith("/") && !p.includes("{") && p.length > 1)
  .map((p) => p.slice(1))
  .sort();

console.log(`openapi_tables=${tables.length}`);

const noRls = [];
const anonReadable = [];
const anonWritable = [];
const blocked = [];
const missing = [];

for (const table of tables) {
  const svc = await admin.from(table).select("*", { count: "exact", head: true });
  if (svc.error) {
    missing.push({ table, err: svc.error.message?.slice(0, 80) });
    continue;
  }
  const pub = await anon.from(table).select("*", { count: "exact", head: true });
  const ins = await anon.from(table).insert({}).select();
  const rlsBlocked =
    ins.error?.code === "42501" ||
    /row-level security|permission denied|violates row-level/i.test(ins.error?.message || "");
  const pubN = pub.error ? null : (pub.count ?? 0);
  const svcN = svc.count ?? 0;

  if (!rlsBlocked && !/Could not find|PGRST/i.test(ins.error?.message || "")) {
    // insert may fail for NOT NULL without RLS; treat "success" or non-RLS errors carefully
    if (!ins.error) {
      noRls.push({ table, reason: "anon INSERT succeeded" });
      anonWritable.push(table);
    } else if (!/null value|not-null|check constraint|invalid input|duplicate|foreign key/i.test(ins.error.message || "")) {
      // unknown error — still note
      if (!/JWT|api key/i.test(ins.error.message || "")) {
        // likely schema validation means request reached table — RLS may be off or permissive
      }
    }
  }

  // Better RLS-on signal: empty insert that hits RLS vs constraint
  if (!ins.error) {
    noRls.push({ table, reason: "anon INSERT allowed" });
  } else if (
    /row-level security/i.test(ins.error.message || "") ||
    ins.error.code === "42501"
  ) {
    // good
  } else if (/null value|not-null|check constraint|invalid input syntax|duplicate key|foreign key/i.test(ins.error.message || "")) {
    // reached table with a permissive policy or no RLS
    noRls.push({ table, reason: `constraint after reach: ${ins.error.message.slice(0, 70)}` });
  }

  if (pubN > 0) anonReadable.push({ table, svcN, pubN });
  else if (svcN > 0 && (pubN === 0 || pub.error)) blocked.push(table);
}

console.log("\nAnon-readable tables (count>0):");
for (const r of anonReadable) console.log(`  ${r.table} svc=${r.svcN} anon=${r.pubN}`);

console.log("\nSuspect no/permissive RLS (anon insert reached table):");
for (const r of noRls) console.log(`  ${r.table}: ${r.reason}`);

console.log("\nBlocked (svc rows, anon empty):", blocked.length);
console.log(blocked.join(", "));

// Also probe known new tables that may not be in OpenAPI yet if migration not applied
console.log("\n=== Explicit new-table probes ===");
for (const table of [
  "membership_plan_configuration",
  "membership_configuration_audit_log",
  "support_to_pro_migration_records",
  "support_to_pro_migration_emails",
  "billing_remediation_log",
  "admin_settings",
]) {
  const svc = await admin.from(table).select("*", { count: "exact", head: true });
  const pub = await anon.from(table).select("*", { count: "exact", head: true });
  const ins = await anon.from(table).insert({}).select();
  console.log(
    table.padEnd(40),
    svc.error ? `svcERR=${svc.error.code}` : `svc=${svc.count ?? 0}`,
    pub.error ? `anonERR=${pub.error.code}` : `anon=${pub.count ?? 0}`,
    ins.error ? `ins=${ins.error.code || ins.error.message?.slice(0, 50)}` : "ins=ALLOWED",
  );
}
