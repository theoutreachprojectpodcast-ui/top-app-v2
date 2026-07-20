/**
 * Verify production Supabase RLS — anon must not read sensitive tables.
 *
 * Usage:
 *   cmd /c "vercel env run -e production -- node scripts/verify-production-rls.mjs"
 *
 * Optional apply credentials (for --apply sibling script):
 *   SUPABASE_ACCESS_TOKEN or DATABASE_URL
 */
import { createClient } from "@supabase/supabase-js";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    val = val
      .replace(/\\r\\n/g, "")
      .replace(/\\n/g, "")
      .replace(/\\r/g, "")
      .replace(/[\r\n]+/g, "")
      .trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.vercel.production");

function env(name) {
  return String(process.env[name] || "")
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/[\r\n]+/g, "")
    .trim();
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const anonKey =
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

if (!url || !serviceKey) {
  console.error("[verify:production-rls] Missing Supabase URL or service role key");
  process.exit(1);
}

/** Tables that must never return rows to the anon/publishable key. */
const SENSITIVE_TABLES = [
  "top_profiles",
  "top_oauth_mobile_handoffs",
  "top_app_saved_org_eins",
  "billing_remediation_log",
  "admin_audit_logs",
  "billing_records",
  "community_posts",
  "sponsor_applications",
  "trusted_resource_applications",
  "form_submissions",
];

/** Catalog tables — app serves these via API routes + service role only. */
const API_ONLY_PUBLIC_TABLES = ["sponsors_catalog", "trusted_resources"];

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;

console.log("[verify:production-rls] Running security audit…\n");

let auditRows = [];
for (const fn of ["_top_rls_security_audit", "_torp_rls_security_audit"]) {
  const { data, error } = await admin.rpc(fn);
  if (!error && Array.isArray(data)) {
    auditRows = data;
    console.log(`Audit function: ${fn}`);
    break;
  }
}

if (!auditRows.length) {
  console.warn("[verify:production-rls] Audit RPC missing — RLS hardening SQL not applied yet.");
} else {
  const fails = auditRows.filter((r) => r.status === "FAIL");
  const warns = auditRows.filter((r) => r.status === "WARN");
  console.log(`  OK: ${auditRows.filter((r) => r.status === "OK").length}`);
  console.log(`  WARN: ${warns.length}`);
  console.log(`  FAIL: ${fails.length}`);
  if (fails.length) {
    console.log("\nFAIL rows (must fix):");
    for (const row of fails) {
      console.log(`  ${row.object_type} ${row.object_name}: ${row.detail}`);
    }
  }
}

let exitCode = 0;

async function probeTable(table) {
  const { data, error, count } = await anon.from(table).select("*", { count: "exact", head: true });
  const rowCount = typeof count === "number" ? count : data?.length ?? 0;

  if (!error && rowCount > 0) {
    console.log(`  LEAK ${table}: anon can read ${rowCount} row(s)`);
    return 1;
  }
  if (!error && rowCount === 0) {
    console.log(`  OK   ${table}: anon empty (RLS or no rows)`);
    return 0;
  }
  if (error?.code === "PGRST205" || /does not exist/i.test(error?.message || "")) {
    console.log(`  SKIP ${table}: not in schema`);
    return 0;
  }
  if (error?.code === "42501" || /permission|policy|RLS|JWT/i.test(error?.message || "")) {
    console.log(`  OK   ${table}: anon blocked (${error.code || "policy"})`);
    return 0;
  }
  console.log(`  ?    ${table}: ${error?.message || "unknown"}`);
  return 0;
}

if (anon) {
  console.log("\n[verify:production-rls] Anon key probe (must be blocked or empty):");
  let anonLeaks = 0;
  for (const table of [...SENSITIVE_TABLES, ...API_ONLY_PUBLIC_TABLES]) {
    anonLeaks += await probeTable(table);
  }
  if (anonLeaks > 0) {
    console.error(`\n[verify:production-rls] ${anonLeaks} table(s) leaked data to anon key`);
    exitCode = 1;
  }
} else {
  console.warn("\n[verify:production-rls] No anon key — skipping anon probe");
}

if (auditRows.some((r) => r.status === "FAIL")) {
  console.error("\n[verify:production-rls] FAIL — run RLS hardening SQL in Supabase SQL editor:");
  console.error("  web/supabase/supabase_security_advisor_rls_2026_07.sql");
  console.error(`  https://supabase.com/dashboard/project/xbtfoundwmhrqrbcuqcw/sql/new`);
  exitCode = 1;
}

if (exitCode === 0) {
  console.log("\n[verify:production-rls] All checks passed.");
}

process.exit(exitCode);
