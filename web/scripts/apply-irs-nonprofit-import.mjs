#!/usr/bin/env node
/**
 * Apply IRS nonprofit import migration + optional QA seed.
 *
 *   node scripts/apply-irs-nonprofit-import.mjs
 *   node scripts/apply-irs-nonprofit-import.mjs --apply
 *   node scripts/apply-irs-nonprofit-import.mjs --apply --seed-qa
 *   node scripts/apply-irs-nonprofit-import.mjs --env=qa --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(webRoot, "supabase/irs_nonprofit_import_2026_07.sql");
const seedPath = path.join(webRoot, "supabase/qa_irs_nonprofit_import_seed_2026_07.sql");
const apply = process.argv.includes("--apply");
const seedQa = process.argv.includes("--seed-qa");
const envArg = (process.argv.find((a) => a.startsWith("--env=")) || "").slice("--env=".length);

function load(rel) {
  const p = path.join(webRoot, rel);
  if (!fs.existsSync(p)) return false;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    v = v.replace(/\\r\\n/g, "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/[\r\n]+/g, "").trim();
    process.env[k] = v;
  }
  return true;
}

function clean(n) {
  return String(process.env[n] || "")
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/[\r\n]+/g, "")
    .trim();
}

const envOrder =
  envArg === "qa"
    ? [".env.vercel.qa", ".env.local"]
    : envArg === "production"
      ? [".env.vercel.production", ".env.production.local", ".env.local"]
      : [".env.vercel.qa", ".env.local", ".env.vercel.production"];

for (const f of envOrder) load(f);

const sql = fs.readFileSync(sqlPath, "utf8");
const seedSql = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, "utf8") : "";
const combinedSql = seedQa && seedSql ? `${sql}\n\n${seedSql}` : sql;

const url = clean("NEXT_PUBLIC_SUPABASE_URL");
const service = clean("SUPABASE_SERVICE_ROLE_KEY");
const accessToken = clean("SUPABASE_ACCESS_TOKEN");
const databaseUrl = clean("DATABASE_URL") || clean("SUPABASE_DB_URL");
const ref = (url.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1] || clean("SUPABASE_PROJECT_REF");
const dbPass = clean("SUPABASE_DB_PASSWORD") || clean("POSTGRES_PASSWORD");

console.log("SQL:", sqlPath);
if (seedQa) console.log("Seed:", seedPath);
console.log("Project ref:", ref || "(unknown)");
console.log("Host:", url ? new URL(url).host : "(missing)");

async function verifyViaServiceRole() {
  if (!url || !service) return { ok: false, reason: "missing_url_or_key" };
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const checks = {};
  for (const table of ["irs_eo_organizations", "irs_nonprofit_import_batches", "nonprofits_search_app_v1"]) {
    // Prefer a real row probe — HEAD can return 204 even when the table is missing from schema cache.
    const { error, count } = await admin.from(table).select("ein", { count: "exact" }).limit(1);
    const missing = error && /PGRST205|Could not find the table|schema cache/i.test(String(error.message || "") + String(error.code || ""));
    checks[table] = error
      ? { ok: false, missing: !!missing, error: error.message, code: error.code }
      : { ok: true, count };
  }
  const col = await admin.from("nonprofits_search_app_v1").select("directory_status").limit(1);
  checks.directory_status = col.error
    ? { ok: false, error: col.error.message, code: col.error.code }
    : { ok: true };
  return checks;
}

async function applyViaManagementApi(query) {
  if (!accessToken) return { ok: false, reason: "no_access_token" };
  if (!ref) return { ok: false, reason: "no_project_ref" };
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
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
  return { ok: true, body };
}

async function applyViaPostgresCandidates(query) {
  const candidates = [
    databaseUrl,
    dbPass && ref
      ? `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
      : "",
    dbPass && ref
      ? `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
      : "",
    dbPass && ref
      ? `postgresql://postgres:${encodeURIComponent(dbPass)}@db.${ref}.supabase.co:5432/postgres`
      : "",
  ].filter(Boolean);

  if (!candidates.length) return { ok: false, reason: "no_database_url" };

  const { default: postgres } = await import("postgres");
  for (const conn of candidates) {
    const safe = conn.replace(/:[^:@/]+@/, ":***@");
    console.log("try", safe);
    const client = postgres(conn, { max: 1, connect_timeout: 10, idle_timeout: 5, prepare: false });
    try {
      await client`select 1`;
      await client.unsafe(query);
      await client.end({ timeout: 5 });
      console.log("SQL APPLIED via postgres");
      return { ok: true };
    } catch (e) {
      console.log("fail:", String(e.message || e).slice(0, 300));
      try {
        await client.end({ timeout: 2 });
      } catch {
        /* ignore */
      }
    }
  }
  return { ok: false, reason: "all_candidates_failed" };
}

const probe = await verifyViaServiceRole();
console.log("Probe:", JSON.stringify(probe, null, 2));

if (!apply) {
  console.log("Dry run only. Re-run with --apply to execute.");
  if (ref) console.log(`Dashboard SQL editor: https://supabase.com/dashboard/project/${ref}/sql/new`);
  process.exit(0);
}

if (envArg === "production" || (ref && /xbtfoundwmhrqrbcuqcw/i.test(ref) && envArg !== "qa")) {
  console.warn("WARNING: target looks like production. Prefer --env=qa first.");
}

let applied = false;
if (accessToken) {
  try {
    await applyViaManagementApi(combinedSql);
    console.log("SQL APPLIED via Management API");
    applied = true;
  } catch (e) {
    console.error("Management API failed:", e.message);
  }
}

if (!applied) {
  const pg = await applyViaPostgresCandidates(combinedSql);
  applied = !!pg.ok;
}

const verify = await verifyViaServiceRole();
console.log("VERIFY:", JSON.stringify(verify, null, 2));

if (!applied && !verify?.irs_eo_organizations?.ok) {
  console.error("\nCould not apply automatically.");
  console.error("Paste the SQL in the Supabase SQL editor:");
  if (ref) console.error(`  https://supabase.com/dashboard/project/${ref}/sql/new`);
  console.error(`  File: ${sqlPath}`);
  process.exit(1);
}

if (verify?.irs_eo_organizations?.ok) {
  console.log("irs_eo_organizations is available.");
  process.exit(0);
}

process.exit(1);
