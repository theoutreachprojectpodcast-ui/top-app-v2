/**
 * Apply member_connections + community posting-mode defaults.
 *
 *   node scripts/apply-member-connections.mjs --apply
 *
 * Prefers SUPABASE_ACCESS_TOKEN (Management API), then DATABASE_URL / pooler.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(webRoot, "supabase/member_connections_2026_07.sql");
const apply = process.argv.includes("--apply");
const PROJECT_REF = "xbtfoundwmhrqrbcuqcw";

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
    v = v.replace(/\\r\\n/g, "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/[\r\n]+/g, "").trim();
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

load(".env.vercel.production");
load(".env.production.local");
load(".env.local");

const sql = fs.readFileSync(sqlPath, "utf8");
const url = clean("NEXT_PUBLIC_SUPABASE_URL");
const service = clean("SUPABASE_SERVICE_ROLE_KEY");
const accessToken = clean("SUPABASE_ACCESS_TOKEN");
const databaseUrl = clean("DATABASE_URL") || clean("SUPABASE_DB_URL");
const ref = (url.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1] || clean("SUPABASE_PROJECT_REF") || PROJECT_REF;
const dbPass = clean("SUPABASE_DB_PASSWORD") || clean("POSTGRES_PASSWORD");

console.log("SQL:", sqlPath);
console.log("Project ref:", ref || "(unknown)");

async function verifyViaServiceRole() {
  if (!url || !service) return null;
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const table = await admin.from("member_connections").select("id").limit(1);
  const mode = await admin
    .from("admin_settings")
    .select("setting_key,setting_value")
    .eq("setting_key", "community_posting_mode")
    .maybeSingle();
  return {
    tableOk: !table.error,
    tableError: table.error ? `${table.error.code}: ${table.error.message}` : null,
    postingMode: mode.error ? null : mode.data?.setting_value || null,
  };
}

async function applyViaManagementApi() {
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
  return { ok: true, body };
}

async function applyViaPostgresCandidates() {
  const candidates = [
    databaseUrl,
    dbPass && ref
      ? `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
      : "",
    dbPass && ref
      ? `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
      : "",
    dbPass && ref
      ? `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
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
      await client.unsafe(sql);
      await client.end({ timeout: 5 });
      console.log("SQL APPLIED via postgres");
      return { ok: true };
    } catch (e) {
      console.log("fail:", String(e.message || e).slice(0, 220));
      try {
        await client.end({ timeout: 2 });
      } catch {
        /* ignore */
      }
    }
  }
  return { ok: false, reason: "all_candidates_failed" };
}

if (!apply) {
  const probe = await verifyViaServiceRole();
  console.log("Probe:", probe);
  console.log("Dry run only. Re-run with --apply to execute.");
  console.log(`Dashboard SQL editor: https://supabase.com/dashboard/project/${ref}/sql/new`);
  process.exit(0);
}

let applied = false;
if (accessToken) {
  try {
    await applyViaManagementApi();
    console.log("SQL APPLIED via Management API");
    applied = true;
  } catch (e) {
    console.error("Management API failed:", e.message);
  }
}

if (!applied) {
  const pg = await applyViaPostgresCandidates();
  applied = !!pg.ok;
}

const verify = await verifyViaServiceRole();
console.log("VERIFY:", verify);

if (!applied && !verify?.tableOk) {
  console.error("\nCould not apply automatically (no SUPABASE_ACCESS_TOKEN / DATABASE_URL / DB password).");
  console.error("Paste this nondestructive SQL in the editor (no DROP statements):");
  console.error(`  https://supabase.com/dashboard/project/${ref}/sql/new`);
  console.error(`  File: ${sqlPath}`);
  process.exit(1);
}

if (verify?.tableOk) {
  console.log("member_connections is available.");
  process.exit(0);
}

process.exit(1);
