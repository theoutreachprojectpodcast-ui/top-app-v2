/**
 * Apply production RLS hardening (Supabase linter rls_disabled_in_public + views).
 *
 * Usage:
 *   node scripts/apply-production-rls-hardening.mjs
 *   node scripts/apply-production-rls-hardening.mjs --apply
 *
 * Apply modes (first match wins):
 *   1. SUPABASE_ACCESS_TOKEN + project ref (Management API — no DB password)
 *   2. DATABASE_URL or SUPABASE_DB_URL (direct postgres)
 *
 * Without credentials, prints SQL path for Supabase SQL editor.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(webRoot, "supabase/supabase_security_advisor_rls_2026_07.sql");
const apply = process.argv.includes("--apply");
const PROJECT_REF = "xbtfoundwmhrqrbcuqcw";

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
loadEnvFile(".env.production.local");
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
const databaseUrl = env("DATABASE_URL") || env("SUPABASE_DB_URL");
const accessToken = env("SUPABASE_ACCESS_TOKEN");

function projectRefFromUrl(supabaseUrl) {
  const m = String(supabaseUrl || "").match(/https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] || env("SUPABASE_PROJECT_REF") || PROJECT_REF;
}

async function runAudit() {
  if (!url || !serviceKey) {
    console.error("[apply-production-rls] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  for (const fn of ["_top_rls_security_audit", "_torp_rls_security_audit", "_top_linter_security_status"]) {
    const { data, error } = await admin.rpc(fn);
    if (!error) {
      return { fn, rows: data || [] };
    }
  }
  console.warn("[apply-production-rls] Audit RPC not found — run hardening SQL in Supabase editor first.");
  return null;
}

async function applyViaManagementApi(sql) {
  const ref = projectRefFromUrl(url);
  if (!accessToken) return { ok: false, reason: "no_access_token" };

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const bodyText = await res.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { message: bodyText };
  }

  if (!res.ok) {
    throw new Error(body.message || body.error || `Management API ${res.status}`);
  }

  console.log(`[apply-production-rls] SQL applied via Management API (project ${ref})`);
  return { ok: true, body };
}

async function applyViaPostgres(sql) {
  if (!databaseUrl) return { ok: false, reason: "no_database_url" };
  const { default: postgres } = await import("postgres");
  const sqlClient = postgres(databaseUrl, { max: 1 });
  try {
    await sqlClient.unsafe(sql);
    console.log("[apply-production-rls] SQL applied via DATABASE_URL");
    return { ok: true };
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

async function applySql() {
  const sql = fs.readFileSync(sqlPath, "utf8");

  if (accessToken) {
    try {
      return (await applyViaManagementApi(sql)).ok;
    } catch (e) {
      console.error("[apply-production-rls] Management API apply failed:", e.message);
    }
  }

  if (databaseUrl) {
    try {
      return (await applyViaPostgres(sql)).ok;
    } catch (e) {
      console.error("[apply-production-rls] Postgres apply failed:", e.message);
    }
  }

  console.log("[apply-production-rls] No apply credentials — run in Production Supabase SQL editor:");
  console.log(`  https://supabase.com/dashboard/project/${projectRefFromUrl(url)}/sql/new`);
  console.log(`  File: ${sqlPath}`);
  console.log("\nOr set one of:");
  console.log("  SUPABASE_ACCESS_TOKEN  (from https://supabase.com/dashboard/account/tokens)");
  console.log("  DATABASE_URL           (Postgres connection string from project Settings → Database)");
  return false;
}

let success = true;
if (apply) {
  try {
    success = await applySql();
  } catch (e) {
    console.error("[apply-production-rls] apply failed:", e.message);
    console.log("[apply-production-rls] Paste SQL manually:", sqlPath);
    success = false;
  }
} else {
  console.log("[apply-production-rls] Probe mode (pass --apply to run SQL)");
  console.log(`[apply-production-rls] SQL file: ${sqlPath}`);
}

const audit = await runAudit();
if (audit) {
  const fails = audit.rows.filter((r) => r.status === "FAIL");
  const warns = audit.rows.filter((r) => r.status === "WARN");
  console.log(`[apply-production-rls] ${audit.fn}: ${fails.length} FAIL, ${warns.length} WARN`);
  for (const row of fails.slice(0, 30)) {
    console.log(`  FAIL ${row.object_type} ${row.object_name}: ${row.detail}`);
  }
  for (const row of warns.slice(0, 10)) {
    console.log(`  WARN ${row.object_type} ${row.object_name}: ${row.detail}`);
  }
  if (fails.length > 30) console.log(`  ... and ${fails.length - 30} more FAIL`);
  if (fails.length === 0) {
    console.log("[apply-production-rls] All audited objects OK (FAIL=0)");
  }
}

if (!apply && audit && audit.rows.some((r) => r.status === "FAIL")) {
  console.log("\n[apply-production-rls] Fix: run this file in Production Supabase SQL editor:");
  console.log("  web/supabase/supabase_security_advisor_rls_2026_07.sql");
}

const auditOk = !audit || audit.rows.every((r) => r.status !== "FAIL");
process.exit(success && auditOk ? 0 : 1);
