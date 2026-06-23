/**
 * Verify (and optionally apply) production Supabase align for torp_* → top_*.
 *
 * Usage:
 *   node scripts/apply-top-production-align.mjs           # probe only
 *   DATABASE_URL=postgresql://... node scripts/apply-top-production-align.mjs --apply
 *
 * Without DATABASE_URL, prints SQL path for Supabase SQL editor.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(webRoot, "supabase/top_production_align_2026_06.sql");
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

async function probe() {
  if (!url || !serviceKey) {
    console.error("[apply-top-production-align] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return false;
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const tables = ["top_oauth_mobile_handoffs", "torp_oauth_mobile_handoffs", "top_profiles", "torp_profiles"];
  let ok = true;
  for (const table of tables) {
    const { error } = await admin.from(table).select("*").limit(1);
    const status = error ? `MISSING (${error.message})` : "OK";
    console.log(`[apply-top-production-align] ${table}: ${status}`);
    if ((table === "top_oauth_mobile_handoffs" || table === "torp_oauth_mobile_handoffs") && !error) {
      ok = true;
    }
    if (table === "top_oauth_mobile_handoffs" && error && table.startsWith("top_")) {
      /* continue */
    }
  }
  const handoffTop = await admin.from("top_oauth_mobile_handoffs").select("state_key").limit(1);
  const handoffLegacy = await admin.from("torp_oauth_mobile_handoffs").select("state_key").limit(1);
  const handoffOk = !handoffTop.error || !handoffLegacy.error;
  const profileTop = await admin.from("top_profiles").select("id").limit(1);
  const profileLegacy = await admin.from("torp_profiles").select("id").limit(1);
  const profileOk = !profileTop.error || !profileLegacy.error;
  if (!handoffOk) {
    console.error("[apply-top-production-align] FAIL no oauth handoff table found");
    ok = false;
  }
  if (!profileOk) {
    console.error("[apply-top-production-align] FAIL no profiles table found");
    ok = false;
  }
  return ok;
}

async function applySql() {
  if (!databaseUrl) {
    console.log("[apply-top-production-align] No DATABASE_URL — run SQL manually in Supabase SQL editor:");
    console.log(`  ${sqlPath}`);
    return false;
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  const { default: postgres } = await import("postgres");
  const sqlClient = postgres(databaseUrl, { max: 1 });
  try {
    await sqlClient.unsafe(sql);
    console.log("[apply-top-production-align] SQL applied via DATABASE_URL");
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
    console.error("[apply-top-production-align] apply failed:", e.message);
    console.log("[apply-top-production-align] Paste SQL manually:", sqlPath);
    success = false;
  }
} else {
  console.log("[apply-top-production-align] Probe mode (pass --apply with DATABASE_URL to run SQL)");
}

const probeOk = await probe();
if (!probeOk && !apply) {
  console.log("\n[apply-top-production-align] Run in Supabase SQL editor:");
  console.log(`  web/supabase/top_production_align_2026_06.sql`);
}

process.exit(success && probeOk ? 0 : 1);
