/**
 * Apply production RLS hardening (Supabase linter 0013 + 0010).
 *
 * Usage:
 *   node scripts/apply-production-rls-hardening.mjs              # probe audit RPC
 *   DATABASE_URL=postgresql://... node scripts/apply-production-rls-hardening.mjs --apply
 *
 * Without DATABASE_URL, prints SQL path for Supabase SQL editor.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(
  webRoot,
  "supabase/supabase_public_rls_hardening_nondestructive_2026_06.sql",
);
const apply = process.argv.includes("--apply");

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

loadEnvFile(".env.local");
loadEnvFile(".env.production.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "";

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

async function probePublicTables() {
  if (!url || !serviceKey) return;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const candidates = [
    "top_oauth_mobile_handoffs",
    "torp_oauth_mobile_handoffs",
    "top_profiles",
    "community_posts",
    "podcast_episodes",
    "sponsors_catalog",
    "trusted_resources",
    "page_content_blocks",
    "admin_audit_logs",
  ];
  for (const table of candidates) {
    const { error } = await admin.from(table).select("*").limit(1);
    if (!error) {
      console.log(`[apply-production-rls] anon/service probe ${table}: readable (${error ? error.message : "OK"})`);
    } else if (error.code === "42501" || /permission|policy|RLS/i.test(error.message)) {
      console.log(`[apply-production-rls] ${table}: blocked by RLS (good for anon if using anon key)`);
    } else if (error.code === "PGRST116" || /does not exist/i.test(error.message)) {
      /* missing */
    } else {
      console.log(`[apply-production-rls] ${table}: ${error.message}`);
    }
  }
}

async function applySql() {
  if (!databaseUrl) {
    console.log("[apply-production-rls] No DATABASE_URL — run in Production Supabase SQL editor:");
    console.log(`  ${sqlPath}`);
    return false;
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  const { default: postgres } = await import("postgres");
  const sqlClient = postgres(databaseUrl, { max: 1 });
  try {
    await sqlClient.unsafe(sql);
    console.log("[apply-production-rls] SQL applied via DATABASE_URL");
    return true;
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
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
  console.log("[apply-production-rls] Probe mode (pass --apply with DATABASE_URL to run SQL)");
}

const audit = await runAudit();
if (audit) {
  const fails = audit.rows.filter((r) => r.status !== "OK");
  console.log(`[apply-production-rls] ${audit.fn}: ${fails.length} issue(s)`);
  for (const row of fails.slice(0, 30)) {
    console.log(`  ${row.status} ${row.object_type} ${row.object_name}: ${row.detail}`);
  }
  if (fails.length > 30) console.log(`  ... and ${fails.length - 30} more`);
  if (fails.length === 0) {
    console.log("[apply-production-rls] All audited objects OK");
  }
}

if (!apply && audit && audit.rows.some((r) => r.status !== "OK")) {
  console.log("\n[apply-production-rls] Fix: run this file in Production Supabase SQL editor:");
  console.log("  web/supabase/supabase_public_rls_hardening_nondestructive_2026_06.sql");
}

process.exit(success && (!audit || audit.rows.every((r) => r.status === "OK")) ? 0 : 1);
